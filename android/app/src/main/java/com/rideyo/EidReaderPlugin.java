package com.rideyo;

import android.app.Activity;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.TagLostException;
import android.nfc.tech.IsoDep;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import net.sf.scuba.smartcards.CardService;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jmrtd.BACKey;
import org.jmrtd.PassportService;
import org.jmrtd.lds.icao.DG1File;
import org.jmrtd.lds.icao.MRZInfo;

import java.io.IOException;
import java.io.InputStream;
import java.security.Security;

/**
 * Reads ICAO 9303 eMRTD chips (T.C. Kimlik Kartı) via JMRTD (BAC + Secure Messaging).
 */
@CapacitorPlugin(name = "EidReader")
public class EidReaderPlugin extends Plugin {

    private static final String TAG = "EidReader";
    private static volatile boolean bcProviderAdded = false;

    private NfcAdapter nfcAdapter;
    private volatile PluginCall pendingCall;
    private volatile String pendingDoc;
    private volatile String pendingDob;
    private volatile String pendingExp;

    static {
        ensureBcProvider();
    }

    private static void ensureBcProvider() {
        if (!bcProviderAdded) {
            Security.insertProviderAt(new BouncyCastleProvider(), 1);
            bcProviderAdded = true;
        }
    }

    @PluginMethod
    public void readIdCard(PluginCall call) {
        String doc = call.getString("docNumber", "").trim().toUpperCase();
        String dob = call.getString("dateOfBirth", "").trim();
        String exp = call.getString("dateOfExpiry", "").trim();

        if (doc.isEmpty() || dob.isEmpty() || exp.isEmpty()) {
            call.reject("Kimlik bilgileri eksik: docNumber, dateOfBirth, dateOfExpiry gerekli.");
            return;
        }

        Activity activity = getActivity();
        nfcAdapter = NfcAdapter.getDefaultAdapter(activity);
        if (nfcAdapter == null) {
            call.reject("Bu cihaz NFC desteklemiyor.");
            return;
        }
        if (!nfcAdapter.isEnabled()) {
            call.reject("NFC kapalı. Lütfen ayarlardan açın.");
            return;
        }

        pendingCall = call;
        pendingDoc  = doc;
        pendingDob  = dob;
        pendingExp  = exp;

        nfcAdapter.enableReaderMode(
            activity,
            this::onTagDiscovered,
            NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_NFC_B |
            NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK |
            NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,
            null
        );
    }

    @PluginMethod
    public void stopReading(PluginCall call) {
        disableReader();
        PluginCall pc = pendingCall;
        pendingCall = null;
        if (pc != null) pc.reject("İptal edildi.");
        call.resolve();
    }

    private void onTagDiscovered(Tag tag) {
        IsoDep isoDep = IsoDep.get(tag);
        if (isoDep == null) {
            rejectPending("Algılanan kart eKimlik formatında değil. T.C. Kimlik Kartınızı kullanın.");
            return;
        }

        final PluginCall call = pendingCall;
        final String doc = pendingDoc;
        final String dob = pendingDob;
        final String exp = pendingExp;
        pendingCall = null;

        if (call == null) return;

        new Thread(() -> {
            try {
                isoDep.connect();
                isoDep.setTimeout(20000);
                call.resolve(readCard(isoDep, doc, dob, exp));
            } catch (TagLostException e) {
                Log.e(TAG, "Tag lost", e);
                call.reject("Kart bağlantısı kesildi. Kimlik kartını telefonun NFC bölgesine tam olarak dayayın ve sabit tutun.");
            } catch (IOException e) {
                Log.e(TAG, "IO hatası", e);
                String msg = e.getMessage();
                call.reject(msg != null && !msg.isEmpty() ? msg : "NFC okuma başarısız. Kartı tekrar deneyin.");
            } catch (Exception e) {
                Log.e(TAG, "Kart okuma hatası", e);
                String msg = e.getMessage();
                call.reject(msg != null && !msg.isEmpty() ? msg : "Kart işlenemedi. Bilgileri kontrol edin.");
            } finally {
                try { isoDep.close(); } catch (Throwable ignored) {}
                try { Thread.sleep(1200); } catch (InterruptedException ignored) {}
                disableReader();
            }
        }).start();
    }

    private void disableReader() {
        try {
            Activity a = getActivity();
            if (nfcAdapter != null && a != null) nfcAdapter.disableReaderMode(a);
        } catch (Exception ignored) {}
    }

    private void rejectPending(String msg) {
        disableReader();
        PluginCall pc = pendingCall;
        pendingCall = null;
        if (pc != null) pc.reject(msg);
    }

    private JSObject readCard(IsoDep isoDep, String doc, String dob, String exp) throws Exception {
        ensureBcProvider();
        Log.w(TAG, "readCard doc=" + doc + " dob=" + dob + " exp=" + exp);

        CardService cardService = CardService.getInstance(isoDep);
        cardService.open();

        PassportService ps = new PassportService(cardService, 256, 256, false, false);
        try {
            ps.open();
            ps.sendSelectApplet(false);

            BACKey bacKey = new BACKey(doc, dob, exp);
            Log.w(TAG, "BAC başlıyor…");
            ps.doBAC(bacKey);
            Log.w(TAG, "BAC başarılı, DG1 okunuyor…");

            try (InputStream dg1Stream = ps.getInputStream(PassportService.EF_DG1)) {
                DG1File dg1File = new DG1File(dg1Stream);
                MRZInfo mrz = dg1File.getMRZInfo();
                Log.w(TAG, "DG1 okundu: " + mrz.getDocumentNumber());
                return fromMrzInfo(mrz);
            }
        } finally {
            try { ps.close(); } catch (Exception ignored) {}
            try { cardService.close(); } catch (Exception ignored) {}
        }
    }

    private JSObject fromMrzInfo(MRZInfo mrz) {
        JSObject out = new JSObject();
        out.put("verified", true);

        String docNum   = nullSafe(mrz.getDocumentNumber()).replace("<", "").trim();
        String surname  = nullSafe(mrz.getPrimaryIdentifier()).replace("<", " ").trim();
        String given    = nullSafe(mrz.getSecondaryIdentifier()).replace("<", " ").trim();
        String optional = nullSafe(mrz.getOptionalData1()).replace("<", "").trim();
        String nationality = nullSafe(mrz.getNationality()).replace("<", "").trim();
        String docCode  = nullSafe(mrz.getDocumentCode());
        String gender   = mrz.getGender() != null ? mrz.getGender().toString() : "";

        boolean td1 = docCode.length() >= 2 || docNum.length() <= 9;
        out.put("format", td1 ? "TD1" : "TD3");
        out.put("documentType", docCode.replace("<", "").trim());
        out.put("country", nullSafe(mrz.getIssuingState()).replace("<", "").trim());
        out.put("documentNumber", docNum);
        out.put("nationalId", !optional.isEmpty() ? optional : docNum);
        out.put("dateOfBirth", nullSafe(mrz.getDateOfBirth()));
        out.put("dateOfExpiry", nullSafe(mrz.getDateOfExpiry()));
        out.put("sex", gender);
        out.put("nationality", nationality);
        out.put("surname", surname);
        out.put("givenNames", given);

        // MRZ lines for display (best-effort reconstruction)
        String nameField = nullSafe(mrz.getPrimaryIdentifier()) + "<<" + nullSafe(mrz.getSecondaryIdentifier());
        if (td1) {
            out.put("mrzLine1", padRight(docCode, 2) + padRight(nullSafe(mrz.getIssuingState()), 3)
                + padRight(nullSafe(mrz.getDocumentNumber()), 9) + padRight(optional, 15));
            out.put("mrzLine2", nullSafe(mrz.getDateOfBirth()) + "X" + gender
                + nullSafe(mrz.getDateOfExpiry()) + "X" + padRight(nationality, 3) + padRight("", 11) + "X");
            out.put("mrzLine3", padRight(nameField, 30));
        } else {
            out.put("mrzLine1", padRight(docCode, 2) + padRight(nullSafe(mrz.getIssuingState()), 3) + padRight(nameField, 39));
            out.put("mrzLine2", padRight(nullSafe(mrz.getDocumentNumber()), 9) + "X"
                + padRight(nationality, 3) + nullSafe(mrz.getDateOfBirth()) + "X" + gender
                + nullSafe(mrz.getDateOfExpiry()) + "X" + padRight(optional, 14) + "X");
        }
        return out;
    }

    private static String nullSafe(String s) {
        return s != null ? s : "";
    }

    private static String padRight(String s, int len) {
        if (s.length() >= len) return s.substring(0, len);
        StringBuilder sb = new StringBuilder(s);
        while (sb.length() < len) sb.append('<');
        return sb.toString();
    }
}
