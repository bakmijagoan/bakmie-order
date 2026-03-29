/**
 * =============================================
 * BAKMIE ORDER — Google Apps Script Backend
 * =============================================
 * 
 * CARA SETUP:
 * 
 * 1. Buka Google Sheets baru → https://sheets.google.com
 * 2. Beri nama sheet pertama: "Pesanan Bakmie"
 * 3. Di baris pertama (header), isi kolom A-M:
 *    A: Timestamp
 *    B: Deskripsi
 *    C: Nama
 *    D: Lantai
 *    E: Unit Kerja
 *    F: Bakmie
 *    G: Rasa
 *    H: Level Pedas
 *    I: Ayam Charsiu
 *    J: Bakso Sapi (2pcs)
 *    K: Extra Kripik Kulit Pangsit
 *    L: Total
 *    M: Status Bayar
 * 
 * 4. Buat sheet kedua, beri nama: "Settings"
 *    - Cell A1: ketik "Status" (header)
 *    - Cell B1: ketik "Pesan" (header)
 *    - Cell A2: ketik "ON" atau "OFF" (untuk buka/tutup PO)
 *    - Cell B2: ketik pesan custom saat PO ditutup (opsional)
 *              Contoh: "PO untuk batch ini sudah ditutup. Tunggu batch berikutnya ya!"
 * 
 * 5. Klik menu Extensions → Apps Script
 * 6. Hapus semua kode di editor, lalu paste kode di bawah ini
 * 7. Klik Deploy → New Deployment
 * 8. Pilih Type: Web App
 * 9. Set:
 *    - Description: Bakmie Order API
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 10. Klik Deploy → Copy URL-nya
 * 11. Paste URL ke file src/main.js di variabel SCRIPT_URL
 * 
 * CARA ON/OFF PO:
 * - Buka sheet "Settings" → ubah cell A2 jadi "ON" atau "OFF"
 * - Gak perlu re-deploy, langsung berlaku!
 * 
 * SELESAI! ✅
 */

// ===== Cek status PO (buka/tutup) =====
function getFormStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settingsSheet = ss.getSheetByName('Settings');
  
  // Kalau sheet Settings belum ada, default ON
  if (!settingsSheet) {
    return { isOpen: true, message: '' };
  }
  
  var status = settingsSheet.getRange('A2').getValue().toString().toUpperCase().trim();
  var message = settingsSheet.getRange('B2').getValue().toString().trim();
  
  return {
    isOpen: status === 'ON',
    message: message || 'Pre-Order untuk saat ini sudah ditutup. Terima kasih!'
  };
}

function doPost(e) {
  try {
    // Cek apakah PO masih buka
    var formStatus = getFormStatus();
    if (!formStatus.isOpen) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'closed', 
          message: formStatus.message 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Parse data dari frontend (support text/plain & application/json)
    var data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      // Fallback untuk form-encoded data
      data = e.parameter;
    } else {
      throw new Error('No data received. postData: ' + JSON.stringify(e));
    }
    
    // Buka sheet pesanan
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Pesanan Bakmie') || ss.getActiveSheet();
    
    // Tambahkan baris baru dengan data pesanan
    sheet.appendRow([
      new Date(),
      data.deskripsi || '-',
      data.nama,
      data.lantai,
      data.unitKerja,
      data.bakmie,
      data.rasa,
      data.levelPedas,
      data.toppingAyamCharsiu || '-',
      data.toppingBaksoSapi || '-',
      data.toppingKripikPangsit || '-',
      data.total,
      data.statusBayar
    ]);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: 'Pesanan berhasil disimpan!' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET request — cek status PO
function doGet(e) {
  var formStatus = getFormStatus();
  
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: formStatus.isOpen ? 'open' : 'closed',
      message: formStatus.message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
