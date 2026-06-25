import Foundation
import CoreNFC
import CommonCrypto
import Capacitor

/**
 * Capacitor plugin for reading ICAO 9303 eID chips (T.C. Kimlik Kartı / ePassport).
 *
 * Flow: SELECT MRTD AID → BAC (3DES) → Select EF.DG1 → Read Binary → Parse MRZ.
 * Secure messaging uses 3DES-CBC with SSC-derived IV and ISO 9797-1 Retail MAC.
 */
@objc(EidReaderPlugin)
public class EidReaderPlugin: CAPPlugin, CAPBridgedPlugin, NFCTagReaderSessionDelegate {

    public let identifier = "EidReaderPlugin"
    public let jsName = "EidReader"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "readIdCard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopReading", returnType: CAPPluginReturnPromise),
    ]

    // ICAO 9303 eMRTD application identifier
    private let MRTD_AID: [UInt8] = [0xA0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01]
    private let DG1_FID:  [UInt8] = [0x01, 0x01]

    private var session:      NFCTagReaderSession?
    private var pendingCall:  CAPPluginCall?
    private var pendingDoc:   String = ""
    private var pendingDob:   String = ""
    private var pendingExp:   String = ""

    // ── Public plugin methods ────────────────────────────────────────────────────

    @objc func readIdCard(_ call: CAPPluginCall) {
        guard let doc = call.getString("docNumber"), !doc.isEmpty,
              let dob = call.getString("dateOfBirth"), !dob.isEmpty,
              let exp = call.getString("dateOfExpiry"), !exp.isEmpty else {
            call.reject("Kimlik bilgileri eksik: docNumber, dateOfBirth, dateOfExpiry gerekli.")
            return
        }

        pendingCall = call
        pendingDoc  = doc.trimmingCharacters(in: .whitespaces).uppercased()
        pendingDob  = dob.trimmingCharacters(in: .whitespaces)
        pendingExp  = exp.trimmingCharacters(in: .whitespaces)

        // NFCTagReaderSession must be created and begun on the main thread.
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.session = NFCTagReaderSession(pollingOption: [.iso14443], delegate: self, queue: nil)
            self.session?.alertMessage = "T.C. Kimlik Kartınızı telefonunuza yaklaştırın."
            self.session?.begin()
        }
    }

    @objc func stopReading(_ call: CAPPluginCall) {
        session?.invalidate()
        session = nil
        if let pc = pendingCall {
            pc.reject("İptal edildi.")
            pendingCall = nil
        }
        call.resolve()
    }

    // ── NFCTagReaderSessionDelegate ─────────────────────────────────────────────

    public func tagReaderSessionDidBecomeActive(_ session: NFCTagReaderSession) {}

    public func tagReaderSession(_ session: NFCTagReaderSession, didInvalidateWithError error: Error) {
        if let pc = pendingCall {
            let err = error as NSError
            // Code 200 = user cancelled; 201 = timed out
            if err.code == 200 || err.code == 201 {
                pc.reject("NFC taraması iptal edildi.")
            } else {
                pc.reject("NFC hatası: \(error.localizedDescription)")
            }
            pendingCall = nil
        }
    }

    public func tagReaderSession(_ session: NFCTagReaderSession, didDetect tags: [NFCTag]) {
        guard let tag = tags.first else { return }

        guard case .iso7816(let iso7816Tag) = tag else {
            session.invalidate(errorMessage: "Kart tipi desteklenmiyor. T.C. Kimlik Kartı kullanın.")
            pendingCall?.reject("ISO 7816 etiketi algılanamadı.")
            pendingCall = nil
            return
        }

        session.connect(to: tag) { [weak self] error in
            guard let self = self else { return }
            if let error = error {
                session.invalidate(errorMessage: "Bağlantı hatası.")
                self.pendingCall?.reject("NFC bağlantı hatası: \(error.localizedDescription)")
                self.pendingCall = nil
                return
            }

            Task {
                do {
                    let result = try await self.readCard(tag: iso7816Tag,
                                                         doc: self.pendingDoc,
                                                         dob: self.pendingDob,
                                                         exp: self.pendingExp)
                    session.invalidate()
                    self.pendingCall?.resolve(result)
                } catch {
                    session.invalidate(errorMessage: error.localizedDescription)
                    self.pendingCall?.reject(error.localizedDescription)
                }
                self.pendingCall = nil
            }
        }
    }

    // ── ICAO 9303 BAC + DG1 read ────────────────────────────────────────────────

    private func readCard(tag: NFCISO7816Tag, doc: String, dob: String, exp: String) async throws -> [String: Any] {

        // 1. SELECT MRTD application
        var resp = try await send(tag: tag, apdu: selectAid(MRTD_AID))
        try assertSW9000(resp, ctx: "AID seçimi")

        // 2. Derive BAC keys
        let doc9    = padDoc(doc)
        let mrzKey  = doc9 + String(checkDigit(doc9)) + dob + String(checkDigit(dob))
                    + exp + String(checkDigit(exp))
        let kseed   = Array(sha1(bytes: Array(mrzKey.utf8)).prefix(16))
        let kEnc    = deriveKey(kseed: kseed, c: 1)
        let kMac    = deriveKey(kseed: kseed, c: 2)

        // 3. GET CHALLENGE
        resp = try await send(tag: tag, apdu: NFCISO7816APDU(instructionClass: 0x00, instructionCode: 0x84,
                                                               p1Parameter: 0x00, p2Parameter: 0x00,
                                                               data: Data(), expectedResponseLength: 8))
        try assertSW9000(resp, ctx: "Get Challenge")
        let rndIc = Array(resp.prefix(8))

        // 4. EXTERNAL AUTHENTICATE
        var rndIfd = [UInt8](repeating: 0, count: 8)
        var kIfd   = [UInt8](repeating: 0, count: 16)
        _ = SecRandomCopyBytes(kSecRandomDefault, rndIfd.count, &rndIfd)
        _ = SecRandomCopyBytes(kSecRandomDefault, kIfd.count, &kIfd)

        let s    = rndIfd + rndIc + kIfd                          // 32 bytes
        let eIfd = try des3Enc(key: kEnc, iv: [UInt8](repeating: 0, count: 8), data: s)
        let mIfd = try retailMac(key: kMac, data: iso9797Pad(eIfd))
        let authData = eIfd + mIfd                                 // 40 bytes

        resp = try await send(tag: tag, apdu: NFCISO7816APDU(
            instructionClass: 0x00, instructionCode: 0x82,
            p1Parameter: 0x00, p2Parameter: 0x00,
            data: Data(authData), expectedResponseLength: 40))
        try assertSW9000(resp, ctx: "External Authenticate")

        // 5. Derive session keys
        let decAuth = try des3Dec(key: kEnc, iv: [UInt8](repeating: 0, count: 8),
                                   data: Array(resp.prefix(resp.count - 10)))
        guard Array(decAuth[8..<16]) == rndIfd else {
            throw EidError.bacFailed("BAC kimlik doğrulama başarısız. Girilen bilgileri kontrol edin.")
        }
        let kIc    = Array(decAuth[16..<32])
        let kSeed2 = xor(kIfd, kIc)
        let kSenc  = deriveKey(kseed: kSeed2, c: 1)
        let kSmac  = deriveKey(kseed: kSeed2, c: 2)

        var ssc = bytesToUInt64(Array(rndIc[4..<8]) + Array(rndIfd[4..<8]))

        // 6. SELECT EF.DG1 (with SM)
        ssc += 1
        resp = try await send(tag: tag, apdu: smCmdData(
            hdr: [0x0C, 0xA4, 0x02, 0x0C], data: DG1_FID, kSenc: kSenc, kSmac: kSmac, ssc: ssc))
        ssc += 1
        try smVerifyResp(resp: resp, kSmac: kSmac, ssc: ssc, hasData: false)

        // 7. READ BINARY EF.DG1 — chunked for DG1 > 256 bytes
        var sscMut = ssc
        let dg1 = try await readBinaryChunked(tag: tag, kSenc: kSenc, kSmac: kSmac, ssc: &sscMut)

        // 8. Parse MRZ
        return try parseDg1(dg1)
    }

    // ── Secure Messaging helpers ─────────────────────────────────────────────────

    /// Reads the currently selected EF in 223-byte plaintext chunks using SM READ BINARY.
    /// 223 = 256 − 33 bytes of SM overhead. Updates ssc for each command/response pair.
    private func readBinaryChunked(tag: NFCISO7816Tag, kSenc: [UInt8], kSmac: [UInt8], ssc: inout UInt64) async throws -> [UInt8] {
        let chunk = 0xDF // 223 plaintext bytes per read

        // First read at offset 0
        ssc += 1
        var resp = try await send(tag: tag, apdu: smCmdRead(
            hdr: [0x0C, 0xB0, 0x00, 0x00], le: UInt8(chunk), kSmac: kSmac, ssc: ssc))
        ssc += 1
        let first = try smDecryptResp(resp: resp, kSenc: kSenc, kSmac: kSmac, ssc: ssc)

        let totalLen = parseDg1OuterLength(first)
        if first.count >= totalLen {
            return Array(first.prefix(totalLen))
        }

        var dg1 = [UInt8](repeating: 0, count: totalLen)
        first.withUnsafeBytes { ptr in
            dg1.withUnsafeMutableBytes { dst in
                dst.copyMemory(from: ptr)
            }
        }
        var offset = first.count

        while offset < totalLen {
            let remaining = totalLen - offset
            let toRead = min(chunk, remaining)
            let p1 = UInt8((offset >> 8) & 0xFF)
            let p2 = UInt8(offset & 0xFF)

            ssc += 1
            resp = try await send(tag: tag, apdu: smCmdRead(
                hdr: [0x0C, 0xB0, p1, p2], le: UInt8(toRead), kSmac: kSmac, ssc: ssc))
            ssc += 1
            let piece = try smDecryptResp(resp: resp, kSenc: kSenc, kSmac: kSmac, ssc: ssc)
            for (i, b) in piece.enumerated() { dg1[offset + i] = b }
            offset += piece.count
        }
        return dg1
    }

    /// Returns the total byte length of the outer DG1 TLV (tag + length + value).
    private func parseDg1OuterLength(_ data: [UInt8]) -> Int {
        guard data.count >= 2 else { return data.count }
        var i = 1 // skip tag
        var len = Int(data[i]); i += 1
        if len == 0x81 { len = Int(data[i]); i += 1 }
        else if len == 0x82 { len = (Int(data[i]) << 8) | Int(data[i+1]); i += 2 }
        return i + len
    }

    private func smCmdData(hdr: [UInt8], data: [UInt8], kSenc: [UInt8], kSmac: [UInt8], ssc: UInt64) throws -> NFCISO7816APDU {
        let iv   = try des3Enc(key: kSenc, iv: [UInt8](repeating: 0, count: 8), data: uint64ToBytes(ssc))
        let enc  = try des3Enc(key: kSenc, iv: iv, data: iso9797Pad(data))
        let do87 = [UInt8(0x87), UInt8(enc.count + 1), 0x01] + enc
        let mac  = try retailMac(key: kSmac,
                                  data: iso9797Pad(uint64ToBytes(ssc)) + iso9797Pad(hdr) + iso9797Pad(do87))
        let do8e = [UInt8(0x8E), 0x08] + mac
        let body = do87 + do8e
        return NFCISO7816APDU(instructionClass: 0x0C, instructionCode: hdr[1],
                               p1Parameter: hdr[2], p2Parameter: hdr[3],
                               data: Data(body), expectedResponseLength: 256)
    }

    private func smCmdRead(hdr: [UInt8], le: UInt8, kSmac: [UInt8], ssc: UInt64) throws -> NFCISO7816APDU {
        let do97 = [UInt8(0x97), 0x01, le]
        let mac  = try retailMac(key: kSmac,
                                  data: iso9797Pad(uint64ToBytes(ssc)) + iso9797Pad(hdr) + iso9797Pad(do97))
        let do8e = [UInt8(0x8E), 0x08] + mac
        let body = do97 + do8e
        return NFCISO7816APDU(instructionClass: 0x0C, instructionCode: hdr[1],
                               p1Parameter: hdr[2], p2Parameter: hdr[3],
                               data: Data(body), expectedResponseLength: 256)
    }

    private func smVerifyResp(resp: [UInt8], kSmac: [UInt8], ssc: UInt64, hasData: Bool) throws {
        let tlv   = try parseRespTlv(resp)
        guard let sw = tlv.sw else { throw EidError.smError("DO'99 yok.") }
        let macIn = iso9797Pad(uint64ToBytes(ssc)) + iso9797Pad(tlv.do99Full)
        let mac   = try retailMac(key: kSmac, data: macIn)
        guard mac == tlv.mac else { throw EidError.smError("SM MAC doğrulama başarısız (SELECT).") }
        guard sw == 0x9000    else { throw EidError.smError(String(format: "SW=%04X", sw)) }
    }

    private func smDecryptResp(resp: [UInt8], kSenc: [UInt8], kSmac: [UInt8], ssc: UInt64) throws -> [UInt8] {
        let tlv = try parseRespTlv(resp)
        guard tlv.sw != nil, let mac = tlv.mac else { throw EidError.smError("SM READ yanıtı geçersiz.") }

        var macIn = iso9797Pad(uint64ToBytes(ssc))
        if let d87f = tlv.do87Full { macIn += iso9797Pad(d87f) }
        macIn += iso9797Pad(tlv.do99Full)

        let computedMac = try retailMac(key: kSmac, data: macIn)
        guard computedMac == mac else { throw EidError.smError("SM MAC doğrulama başarısız (READ).") }
        guard tlv.sw == 0x9000    else { throw EidError.smError(String(format: "DG1 okuma başarısız: SW=%04X", tlv.sw!)) }

        guard let enc87 = tlv.do87enc else { throw EidError.smError("Kart veri döndürmedi.") }
        let encData = Array(enc87.dropFirst()) // strip padding indicator 0x01
        let iv      = try des3Enc(key: kSenc, iv: [UInt8](repeating: 0, count: 8), data: uint64ToBytes(ssc))
        return iso9797Unpad(try des3Dec(key: kSenc, iv: iv, data: encData))
    }

    // ── TLV response parser ──────────────────────────────────────────────────────

    private struct RespTlv {
        var do87enc:  [UInt8]? // value bytes of DO'87 (including 0x01 indicator)
        var do87Full: [UInt8]? // full DO'87 tag+len+value
        var do99Full: [UInt8]  = []
        var sw:       UInt16?
        var mac:      [UInt8]?
    }

    private func parseRespTlv(_ resp: [UInt8]) throws -> RespTlv {
        var r = RespTlv()
        var i = 0
        let end = resp.count - 2 // last 2 bytes are SW from NFCISO7816Tag response

        while i < end {
            let tagStart = i
            var tag: UInt16
            if (resp[i] & 0x1F) == 0x1F {
                tag = (UInt16(resp[i]) << 8) | UInt16(resp[i+1]); i += 2
            } else {
                tag = UInt16(resp[i]); i += 1
            }
            var len = Int(resp[i]); i += 1
            if len == 0x81 { len = Int(resp[i]); i += 1 }
            else if len == 0x82 { len = (Int(resp[i]) << 8) | Int(resp[i+1]); i += 2 }

            let val = Array(resp[i..<(i+len)]); i += len

            switch tag {
            case 0x87:
                r.do87enc  = val
                r.do87Full = Array(resp[tagStart..<i])
            case 0x99:
                r.do99Full = Array(resp[tagStart..<i])
                if val.count == 2 { r.sw = (UInt16(val[0]) << 8) | UInt16(val[1]) }
            case 0x8E:
                r.mac = val
            default:
                break
            }
        }
        return r
    }

    // ── DG1 / MRZ parser ────────────────────────────────────────────────────────

    private func parseDg1(_ dg1: [UInt8]) throws -> [String: Any] {
        var mrzStr: String? = nil
        var i = 0
        while i < dg1.count {
            var tag: UInt16
            if (dg1[i] & 0x1F) == 0x1F {
                tag = (UInt16(dg1[i]) << 8) | UInt16(dg1[i+1]); i += 2
            } else {
                tag = UInt16(dg1[i]); i += 1
            }
            var len = Int(dg1[i]); i += 1
            if len == 0x81 { len = Int(dg1[i]); i += 1 }
            else if len == 0x82 { len = (Int(dg1[i]) << 8) | Int(dg1[i+1]); i += 2 }

            if tag == 0x5F1F || tag == 0x5F19 {
                mrzStr = String(bytes: Array(dg1[i..<(i+len)]), encoding: .utf8)
                break
            }
            if tag != 0x61 { i += len }
        }
        guard let mrz = mrzStr else { throw EidError.parseFailed("DG1 içinde MRZ bulunamadı.") }

        var out: [String: Any] = ["verified": true]

        if mrz.count == 90 {
            let chars = Array(mrz)
            let l1 = String(chars[0..<30])
            let l2 = String(chars[30..<60])
            let l3 = String(chars[60..<90])
            out["format"]         = "TD1"
            out["mrzLine1"]       = l1
            out["mrzLine2"]       = l2
            out["mrzLine3"]       = l3
            out["documentType"]   = String(chars[0..<2]).replacingOccurrences(of: "<", with: "").trimmingCharacters(in: .whitespaces)
            out["country"]        = String(chars[2..<5]).replacingOccurrences(of: "<", with: "")
            out["documentNumber"] = String(chars[5..<14]).replacingOccurrences(of: "<", with: "")
            out["nationalId"]     = String(chars[14..<25]).replacingOccurrences(of: "<", with: "")
            out["dateOfBirth"]    = String(chars[30..<36])
            out["sex"]            = String(chars[37])
            out["dateOfExpiry"]   = String(chars[38..<44])
            out["nationality"]    = String(chars[45..<48]).replacingOccurrences(of: "<", with: "")
            let nameStr = String(chars[60..<90])
            let parts = nameStr.components(separatedBy: "<<")
            out["surname"]    = parts[0].replacingOccurrences(of: "<", with: " ").trimmingCharacters(in: .whitespaces)
            out["givenNames"] = parts.count > 1 ? parts[1].replacingOccurrences(of: "<", with: " ").trimmingCharacters(in: .whitespaces) : ""
        } else if mrz.count == 88 {
            let chars = Array(mrz)
            let l1 = String(chars[0..<44])
            let l2 = String(chars[44..<88])
            out["format"]         = "TD3"
            out["mrzLine1"]       = l1
            out["mrzLine2"]       = l2
            out["documentType"]   = String(chars[0])
            out["country"]        = String(chars[2..<5]).replacingOccurrences(of: "<", with: "")
            out["documentNumber"] = String(Array(mrz)[44..<53]).replacingOccurrences(of: "<", with: "")
            out["nationalId"]     = String(Array(mrz)[72..<79]).replacingOccurrences(of: "<", with: "")
            out["dateOfBirth"]    = String(Array(mrz)[57..<63])
            out["sex"]            = String(Array(mrz)[64])
            out["dateOfExpiry"]   = String(Array(mrz)[65..<71])
            out["nationality"]    = String(Array(mrz)[54..<57]).replacingOccurrences(of: "<", with: "")
            let namePart = String(chars[5..<44])
            let parts = namePart.components(separatedBy: "<<")
            out["surname"]    = parts[0].replacingOccurrences(of: "<", with: " ").trimmingCharacters(in: .whitespaces)
            out["givenNames"] = parts.count > 1 ? parts[1].replacingOccurrences(of: "<", with: " ").trimmingCharacters(in: .whitespaces) : ""
        } else {
            throw EidError.parseFailed("Bilinmeyen MRZ formatı (uzunluk=\(mrz.count)).")
        }
        return out
    }

    // ── Crypto helpers ───────────────────────────────────────────────────────────

    private func sha1(bytes: [UInt8]) -> [UInt8] {
        var digest = [UInt8](repeating: 0, count: Int(CC_SHA1_DIGEST_LENGTH))
        CC_SHA1(bytes, CC_LONG(bytes.count), &digest)
        return digest
    }

    private func deriveKey(kseed: [UInt8], c: UInt8) -> [UInt8] {
        return Array(sha1(bytes: kseed + [0, 0, 0, c]).prefix(16))
    }

    private func des3Enc(key: [UInt8], iv: [UInt8], data: [UInt8]) throws -> [UInt8] {
        return try ccDes(key: key, iv: iv, data: data, op: CCOperation(kCCEncrypt), alg: CCAlgorithm(kCCAlgorithm3DES))
    }

    private func des3Dec(key: [UInt8], iv: [UInt8], data: [UInt8]) throws -> [UInt8] {
        return try ccDes(key: key, iv: iv, data: data, op: CCOperation(kCCDecrypt), alg: CCAlgorithm(kCCAlgorithm3DES))
    }

    private func desEnc(key: [UInt8], iv: [UInt8], data: [UInt8]) throws -> [UInt8] {
        return try ccDes(key: key, iv: iv, data: data, op: CCOperation(kCCEncrypt), alg: CCAlgorithm(kCCAlgorithmDES))
    }

    private func desDec(key: [UInt8], iv: [UInt8], data: [UInt8]) throws -> [UInt8] {
        return try ccDes(key: key, iv: iv, data: data, op: CCOperation(kCCDecrypt), alg: CCAlgorithm(kCCAlgorithmDES))
    }

    private func ccDes(key: [UInt8], iv: [UInt8], data: [UInt8], op: CCOperation, alg: CCAlgorithm) throws -> [UInt8] {
        let key24 = alg == CCAlgorithm(kCCAlgorithm3DES) ? to24Bytes(key) : key
        // When iv is empty the caller wants ECB mode (no IV, block-independent).
        let options: CCOptions = iv.isEmpty ? CCOptions(kCCOptionECBMode) : 0
        var outBuf = [UInt8](repeating: 0, count: data.count + 16)
        var outLen = 0
        let status = CCCrypt(op, alg, options,
                             key24, key24.count,
                             iv.isEmpty ? nil : iv,
                             data, data.count,
                             &outBuf, outBuf.count, &outLen)
        guard status == kCCSuccess else { throw EidError.cryptoError("CCCrypt hatası: \(status)") }
        return Array(outBuf.prefix(outLen))
    }

    // ISO 9797-1 Algorithm 3 Retail MAC
    private func retailMac(key: [UInt8], data: [UInt8]) throws -> [UInt8] {
        // data must already be padded (from the caller)
        let ka = Array(key.prefix(8))
        let kb = Array(key.suffix(8))

        // DES-CBC with Ka and IV=0 over all blocks
        let cbc  = try desEnc(key: ka, iv: [UInt8](repeating: 0, count: 8), data: data)
        let last = Array(cbc.suffix(8))

        // DES-Dec with Kb (ECB), then DES-Enc with Ka (ECB)
        let dec  = try desDec(key: kb, iv: [], data: last)
        return try desEnc(key: ka, iv: [], data: dec)
    }

    // ── Padding helpers ──────────────────────────────────────────────────────────

    private func iso9797Pad(_ data: [UInt8]) -> [UInt8] {
        let padLen = 8 - (data.count % 8)
        var r = data + [0x80] + [UInt8](repeating: 0x00, count: padLen - 1)
        return r
    }

    private func iso9797Unpad(_ data: [UInt8]) -> [UInt8] {
        var i = data.count - 1
        while i >= 0 && data[i] == 0x00 { i -= 1 }
        return i >= 0 && data[i] == 0x80 ? Array(data.prefix(i)) : data
    }

    private func to24Bytes(_ key: [UInt8]) -> [UInt8] {
        if key.count == 24 { return key }
        return key + Array(key.prefix(8))
    }

    // ── APDU helpers ─────────────────────────────────────────────────────────────

    private func selectAid(_ aid: [UInt8]) -> NFCISO7816APDU {
        return NFCISO7816APDU(instructionClass: 0x00, instructionCode: 0xA4,
                               p1Parameter: 0x04, p2Parameter: 0x0C,
                               data: Data(aid), expectedResponseLength: -1)
    }

    private func send(tag: NFCISO7816Tag, apdu: NFCISO7816APDU) async throws -> [UInt8] {
        return try await withCheckedThrowingContinuation { cont in
            tag.sendCommand(apdu: apdu) { data, sw1, sw2, error in
                if let e = error { cont.resume(throwing: e); return }
                cont.resume(returning: Array(data) + [sw1, sw2])
            }
        }
    }

    private func assertSW9000(_ resp: [UInt8], ctx: String) throws {
        guard resp.count >= 2 else { throw EidError.apduError("\(ctx): boş yanıt.") }
        let sw = (UInt16(resp[resp.count-2]) << 8) | UInt16(resp[resp.count-1])
        guard sw == 0x9000 else { throw EidError.apduError(String(format: "\(ctx) başarısız: SW=%04X", sw)) }
    }

    // ── MRZ helpers ──────────────────────────────────────────────────────────────

    private func checkDigit(_ s: String) -> Int {
        let weights = [7, 3, 1]
        var sum = 0
        for (i, c) in s.enumerated() {
            let v: Int
            if let d = c.asciiValue {
                if d >= 48 && d <= 57 { v = Int(d - 48) }
                else if d >= 65 && d <= 90 { v = Int(d - 65 + 10) }
                else { v = 0 }
            } else { v = 0 }
            sum += v * weights[i % 3]
        }
        return sum % 10
    }

    private func padDoc(_ n: String) -> String {
        var s = n
        while s.count < 9 { s += "<" }
        return String(s.prefix(9)).uppercased()
    }

    // ── Byte utilities ───────────────────────────────────────────────────────────

    private func xor(_ a: [UInt8], _ b: [UInt8]) -> [UInt8] {
        return zip(a, b).map { $0 ^ $1 }
    }

    private func bytesToUInt64(_ bytes: [UInt8]) -> UInt64 {
        return bytes.reduce(0) { ($0 << 8) | UInt64($1) }
    }

    private func uint64ToBytes(_ v: UInt64) -> [UInt8] {
        var result = [UInt8](repeating: 0, count: 8)
        var val = v
        for i in stride(from: 7, through: 0, by: -1) {
            result[i] = UInt8(val & 0xFF)
            val >>= 8
        }
        return result
    }
}

enum EidError: Error, LocalizedError {
    case bacFailed(String)
    case smError(String)
    case parseFailed(String)
    case apduError(String)
    case cryptoError(String)

    var errorDescription: String? {
        switch self {
        case .bacFailed(let m), .smError(let m), .parseFailed(let m),
             .apduError(let m), .cryptoError(let m): return m
        }
    }
}
