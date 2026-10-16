import ExcelJS from 'exceljs';
import avoraLogoUrl from '../assets/avora_logo.png';

let cachedLogoBase64 = null;

const getAvoraLogoBase64 = async () => {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const response = await fetch(avoraLogoUrl);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    cachedLogoBase64 = `data:image/png;base64,${btoa(binary)}`;
    return cachedLogoBase64;
  } catch {
    return null;
  }
};

/**
 * Generate standard room export filename with current timestamp (YYYYMMDD).
 * e.g., AVORA_Danh_sach_buong_phong_20261016.xlsx
 */
export const getRoomExportExcelFilename = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `AVORA_Danh_sach_buong_phong_${year}${month}${day}.xlsx`;
};

const getStatusLabel = (room) => {
  if (room.is_deleted) return 'Đã khóa';
  switch (room.status_cd) {
    case 'AVAILABLE':
      return 'Đang mở bán';
    case 'OCCUPIED':
      return 'Đang có khách';
    case 'BOOKED':
      return 'Đã đặt trước';
    case 'MAINTENANCE':
      return 'Đang bảo trì';
    case 'LOCKED':
      return 'Tạm khóa';
    default:
      return room.status_cd || 'Đang mở bán';
  }
};

/**
 * Export rooms list to a luxury, executive-grade Excel (.xlsx) report
 * matching the exact AVORA Enterprise branding of Users & Amenities reports.
 *
 * @param {Array} rooms - List of room objects from database
 * @param {string} [hotelName] - Current hotel context name
 * @param {string} [customFilename] - Optional override filename
 * @returns {Promise<{ success: boolean, count?: number, filename?: string, message?: string }>}
 */
export const exportRoomsToExcel = async (
  rooms = [],
  hotelName = 'Tất cả cơ sở lưu trú',
  customFilename
) => {
  if (!rooms || rooms.length === 0) {
    return { success: false, message: 'Không có dữ liệu buồng phòng để xuất file.' };
  }

  const filename = customFilename || getRoomExportExcelFilename();

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA Hotel Management System';
    workbook.lastModifiedBy = 'AVORA Executive CMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = 'Danh sách buồng phòng';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: {
        tabColor: { argb: 'FF003580' },
        defaultRowHeight: 22,
      },
      views: [{ state: 'normal' }],
    });

    // ─── 1. Columns Configuration ───────────────────────────────────────────
    worksheet.columns = [
      { key: 'stt', width: 8 },           // A: STT
      { key: 'hotel', width: 28 },        // B: Cơ sở khách sạn
      { key: 'room_number', width: 14 },  // C: Số phòng
      { key: 'sku', width: 20 },          // D: Mã định danh (SKU)
      { key: 'type_name', width: 28 },    // E: Hạng phòng
      { key: 'floor', width: 16 },        // F: Vị trí tầng
      { key: 'room_size', width: 14 },    // G: Diện tích
      { key: 'bed_type', width: 24 },     // H: Quy cách giường
      { key: 'capacity', width: 20 },     // I: Sức chứa
      { key: 'price', width: 20 },        // J: Giá niêm yết (VND)
      { key: 'status', width: 20 },       // K: Trạng thái
    ];

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // ─── 2. Report Header / Branding ─────────────────────────────────────────
    // Row 1: Logo & Enterprise Badge
    worksheet.getRow(1).height = 40;
    const logoBase64 = await getAvoraLogoBase64();
    if (logoBase64) {
      const logoId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      worksheet.addImage(logoId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 135, height: 36 },
      });
    }

    worksheet.mergeCells('F1:K1');
    const brandCell = worksheet.getCell('F1');
    brandCell.value = 'HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP • AVORA ENTERPRISE';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Report Title
    worksheet.mergeCells('A2:K2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'DANH SÁCH BUỒNG PHÒNG KHÁCH SẠN';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 26;

    // Row 3: Subtitle & Export Date
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A3:K3');
    const subCell = worksheet.getCell('A3');
    subCell.value = `Hotel Management System • Báo cáo quản trị buồng phòng lưu trú (${hotelName})  |  Thời gian xuất: ${formattedDate}`;
    subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(3).height = 18;

    // Row 4: Small spacing row
    worksheet.getRow(4).height = 6;

    // ─── 3. Table Header (Row 5) ─────────────────────────────────────────────
    const headerRow = worksheet.getRow(5);
    headerRow.height = 28;

    const headers = [
      'STT',
      'Cơ sở khách sạn',
      'Số phòng',
      'Mã định danh (SKU)',
      'Hạng phòng',
      'Vị trí tầng',
      'Diện tích',
      'Quy cách giường',
      'Sức chứa',
      'Giá niêm yết (VND)',
      'Trạng thái',
    ];

    headers.forEach((hdr, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = hdr;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003580' }, // AVORA Deep Navy
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF002866' } },
        left: { style: 'thin', color: { argb: 'FF0A4799' } },
        right: { style: 'thin', color: { argb: 'FF0A4799' } },
        bottom: { style: 'medium', color: { argb: 'FFC9A227' } }, // Elegant Gold Divider
      };
    });

    // ─── 4. Data Rows (Row 6+) ───────────────────────────────────────────────
    rooms.forEach((room, index) => {
      const rowIndex = 6 + index;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const isEven = index % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      const rt = room.m_room_type || {};
      const hotel = room.m_hotel || {};
      const stt = index + 1;
      const roomHotelName = hotel.name || hotelName || 'Chưa cập nhật';
      const roomNumber = room.room_number || '-';
      const sku = (room.sku || `SKU-${roomNumber}`).replace(/^SKU:\s*/i, '');
      const typeName = rt.type_name || 'Phòng tiêu chuẩn';
      const floor = room.floor || 'Tầng 1';
      const roomSize = rt.room_size || '-';
      const bedType = rt.bed_type || '-';
      const capacity = `${rt.max_adults || 2} người lớn, ${rt.max_children || 0} trẻ em`;
      const price = Number(rt.default_price) || 0;
      const status = getStatusLabel(room);

      const isAvailable = !room.is_deleted && room.status_cd === 'AVAILABLE';
      const isOccupied = !room.is_deleted && (room.status_cd === 'OCCUPIED' || room.status_cd === 'BOOKED');

      // Cell 1: STT
      const c1 = row.getCell(1);
      c1.value = stt;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c1.border = thinBorder;

      // Cell 2: Cơ sở khách sạn
      const c2 = row.getCell(2);
      c2.value = roomHotelName;
      c2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c2.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c2.border = thinBorder;

      // Cell 3: Số phòng
      const c3 = row.getCell(3);
      c3.value = roomNumber;
      c3.alignment = { horizontal: 'center', vertical: 'middle' };
      c3.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c3.border = thinBorder;

      // Cell 4: Mã định danh (SKU)
      const c4 = row.getCell(4);
      c4.value = sku;
      c4.alignment = { horizontal: 'center', vertical: 'middle' };
      c4.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c4.border = thinBorder;

      // Cell 5: Hạng phòng
      const c5 = row.getCell(5);
      c5.value = typeName;
      c5.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c5.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c5.border = thinBorder;

      // Cell 6: Vị trí tầng
      const c6 = row.getCell(6);
      c6.value = floor;
      c6.alignment = { horizontal: 'center', vertical: 'middle' };
      c6.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c6.border = thinBorder;

      // Cell 7: Diện tích
      const c7 = row.getCell(7);
      c7.value = roomSize;
      c7.alignment = { horizontal: 'center', vertical: 'middle' };
      c7.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c7.border = thinBorder;

      // Cell 8: Quy cách giường
      const c8 = row.getCell(8);
      c8.value = bedType;
      c8.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c8.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c8.border = thinBorder;

      // Cell 9: Sức chứa
      const c9 = row.getCell(9);
      c9.value = capacity;
      c9.alignment = { horizontal: 'center', vertical: 'middle' };
      c9.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c9.border = thinBorder;

      // Cell 10: Giá niêm yết (VND)
      const c10 = row.getCell(10);
      c10.value = price;
      c10.numFmt = '#,##0 "đ"';
      c10.alignment = { horizontal: 'right', vertical: 'middle' };
      c10.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c10.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c10.border = thinBorder;

      // Cell 11: Trạng thái
      const c11 = row.getCell(11);
      c11.value = status;
      c11.alignment = { horizontal: 'center', vertical: 'middle' };
      c11.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: {
          argb: isAvailable ? 'FF065F46' : isOccupied ? 'FF9A3412' : 'FF991B1B',
        },
      };
      c11.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: isAvailable ? 'FFECFDF5' : isOccupied ? 'FFFFEDD5' : 'FFFEF2F2',
        },
      };
      c11.border = thinBorder;
    });

    // ─── 5. Table Total Footer Row ───────────────────────────────────────────
    const lastDataRow = 5 + rooms.length;
    const footerRowIndex = lastDataRow + 1;
    const footerRow = worksheet.getRow(footerRowIndex);
    footerRow.height = 24;

    worksheet.mergeCells(`A${footerRowIndex}:I${footerRowIndex}`);
    const fTitle = worksheet.getCell(`A${footerRowIndex}`);
    fTitle.value = `TỔNG CỘNG (${rooms.length} BUỒNG PHÒNG) • TỔNG GIÁ NIÊM YẾT`;
    fTitle.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
    fTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const fPrice = worksheet.getCell(`J${footerRowIndex}`);
    fPrice.value = { formula: `SUM(J6:J${lastDataRow})` };
    fPrice.numFmt = '#,##0 "đ"';
    fPrice.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    fPrice.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let col = 1; col <= 11; col++) {
      const cell = footerRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'double', color: { argb: 'FF003580' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    worksheet.autoFilter = `A5:K${lastDataRow}`;

    // ─── 6. Corporate Signature & Approval Block ────────────────────────────
    const nowSign = new Date();
    const signYear = nowSign.getFullYear();
    const signMonth = String(nowSign.getMonth() + 1).padStart(2, '0');
    const signDay = String(nowSign.getDate()).padStart(2, '0');

    const sigDateRowIndex = footerRowIndex + 2;

    worksheet.mergeCells(`H${sigDateRowIndex}:K${sigDateRowIndex}`);
    const sigDateCell = worksheet.getCell(`H${sigDateRowIndex}`);
    sigDateCell.value = `..., ngày ${signDay} tháng ${signMonth} năm ${signYear}`;
    sigDateCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF334155' } };
    sigDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigDateRowIndex).height = 20;

    const sigTitleRowIndex = sigDateRowIndex + 1;
    worksheet.mergeCells(`A${sigTitleRowIndex}:C${sigTitleRowIndex}`);
    worksheet.getCell(`A${sigTitleRowIndex}`).value = 'NGƯỜI LẬP BIỂU';
    worksheet.getCell(`A${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`A${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigTitleRowIndex}:G${sigTitleRowIndex}`);
    worksheet.getCell(`D${sigTitleRowIndex}`).value = 'QUẢN LÝ VẬN HÀNH KHÁCH SẠN';
    worksheet.getCell(`D${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`D${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`H${sigTitleRowIndex}:K${sigTitleRowIndex}`);
    worksheet.getCell(`H${sigTitleRowIndex}`).value = 'GIÁM ĐỐC / ĐẠI DIỆN VẬN HÀNH';
    worksheet.getCell(`H${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`H${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigTitleRowIndex).height = 24;

    const sigNoteRowIndex = sigTitleRowIndex + 1;
    worksheet.mergeCells(`A${sigNoteRowIndex}:C${sigNoteRowIndex}`);
    worksheet.getCell(`A${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`A${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`A${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNoteRowIndex}:G${sigNoteRowIndex}`);
    worksheet.getCell(`D${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`D${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`D${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`H${sigNoteRowIndex}:K${sigNoteRowIndex}`);
    worksheet.getCell(`H${sigNoteRowIndex}`).value = '(Ký, đóng dấu, ghi rõ họ tên)';
    worksheet.getCell(`H${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`H${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNoteRowIndex).height = 18;

    worksheet.getRow(sigNoteRowIndex + 1).height = 18;
    worksheet.getRow(sigNoteRowIndex + 2).height = 18;
    worksheet.getRow(sigNoteRowIndex + 3).height = 18;

    const sigNameRowIndex = sigNoteRowIndex + 4;
    worksheet.mergeCells(`A${sigNameRowIndex}:C${sigNameRowIndex}`);
    worksheet.getCell(`A${sigNameRowIndex}`).value = 'Hệ thống AVORA ERP';
    worksheet.getCell(`A${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`A${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNameRowIndex}:G${sigNameRowIndex}`);
    worksheet.getCell(`D${sigNameRowIndex}`).value = 'Phòng Quản lý Dịch vụ Lưu trú';
    worksheet.getCell(`D${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`D${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`H${sigNameRowIndex}:K${sigNameRowIndex}`);
    worksheet.getCell(`H${sigNameRowIndex}`).value = 'Ban Quản lý AVORA Hotels';
    worksheet.getCell(`H${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`H${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNameRowIndex).height = 22;

    worksheet.getRow(sigNameRowIndex + 1).height = 8;
    const authRowIndex = sigNameRowIndex + 2;
    worksheet.mergeCells(`A${authRowIndex}:K${authRowIndex}`);
    const authCell = worksheet.getCell(`A${authRowIndex}`);
    authCell.value = '✓ Báo cáo trích xuất tự động từ Hệ thống Quản trị Doanh nghiệp AVORA Enterprise • Bảo mật nội bộ';
    authCell.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
    authCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(authRowIndex).height = 18;

    // ─── 7. Print Layout Setup ───────────────────────────────────────────────
    worksheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    };

    worksheet.headerFooter = {
      oddHeader: '&L&B&"Segoe UI"AVORA HOTELS & RESORTS&R&"Segoe UI"Báo cáo Quản trị Buồng phòng',
      oddFooter: '&L&"Segoe UI"Tài liệu nội bộ AVORA • Bảo mật&R&"Segoe UI"Trang &P / &N',
    };

    // ─── 8. Write and Trigger Browser Download ───────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      count: rooms.length,
      filename,
    };
  } catch (error) {
    console.error('Error generating luxury Room Excel report:', error);
    return {
      success: false,
      message: error.message || 'Lỗi khi tạo file Excel báo cáo buồng phòng.',
    };
  }
};
