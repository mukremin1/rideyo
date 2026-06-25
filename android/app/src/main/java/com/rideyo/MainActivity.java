package com.rideyo;

import android.content.Intent;
import android.nfc.NfcAdapter;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(EidReaderPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * Silently consume any NFC TECH_DISCOVERED intents that Android dispatches after
     * our reader mode ends while the card is still on the reader. Without this override,
     * Android would show "No supported application found" popup for the IsoDep tag.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String action = intent.getAction();
        if (NfcAdapter.ACTION_TECH_DISCOVERED.equals(action) ||
            NfcAdapter.ACTION_TAG_DISCOVERED.equals(action) ||
            NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action)) {
            // Intentionally do nothing — tag already handled via reader mode.
        }
    }
}
