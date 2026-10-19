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
 * Generate a standard filename with current timestamp (YYYYMMDD).
 * e.g., AVORA_Danh_muc_tien_nghi_20260929.xlsx
 */
export const getExportExcelFilename = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `AVORA_Danh_muc_tien_nghi_${year}${month}${day}.xlsx`;
};

/**
 * Export facilities/amenities data to a luxury, executive-grade Excel (.xlsx) report.
 * Designed for AVORA Hotel Management with full branding and smooth vertical scrolling.
 *
 * @param {Array} amenities - List of amenity objects from database
 * @param {string} [customFilename] - Optional override filename
 * @returns {Promise<{ success: boolean, count?: number, filename?: string, message?: string }>}
 */
export const exportAmenitiesToExcel = async (amenities, customFilename) => {
  if (!amenities || amenities.length === 0) {
    return { success: false, message: 'Không có dữ liệu tiện nghi để xuất file.' };
  }

  const filename = customFilename || getExportExcelFilename();

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA Hotel Management System';
    workbook.lastModifiedBy = 'AVORA Executive CMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = 'Danh mục tiện nghi';
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
      { key: 'name', width: 36 },          // B: Tên tiện nghi
      { key: 'type', width: 22 },          // C: Loại tiện ích
      { key: 'applied_count', width: 22 }, // D: Số lượng đang áp dụng
      { key: 'applied_unit', width: 16 },  // E: Đơn vị áp dụng
      { key: 'pricing', width: 18 },       // F: Biểu phí
      { key: 'highlight', width: 14 },     // G: Nổi bật
      { key: 'status', width: 20 },        // H: Trạng thái
    ];

    // Common border styles
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

    worksheet.mergeCells('D1:H1');
    const brandCell = worksheet.getCell('D1');
    brandCell.value = 'HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP • AVORA ENTERPRISE';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Report Title
    worksheet.mergeCells('A2:H2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'DANH MỤC TIỆN NGHI KHÁCH SẠN';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 26;

    // Row 3: Subtitle & Export Date
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A3:H3');
    const subCell = worksheet.getCell('A3');
    subCell.value = `Hotel Management System • Báo cáo quản trị lưu trú nội bộ  |  Thời gian xuất: ${formattedDate}`;
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
      'Tên tiện nghi',
      'Loại tiện ích',
      'Số lượng đang áp dụng',
      'Đơn vị áp dụng',
      'Biểu phí',
      'Nổi bật',
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
    amenities.forEach((item, index) => {
      const rowIndex = 6 + index;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const isEven = index % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Alternating zebra stripe

      // Value extraction
      const stt = index + 1;
      const name = item.name_vi || item.facility_name || '';
      const type = item.type || '';
      const appliedCount = Number(item.applied_count) || 0;
      const appliedUnit = item.applied_unit || '';
      const isPaid = Boolean(item.is_paid);
      const pricing = item.pricing_label || (isPaid ? 'Có phụ phí' : 'Miễn phí');
      const isHighlight = Boolean(item.is_highlight);
      const highlight = isHighlight ? 'Có' : 'Không';
      const isActive = Boolean(item.is_active);
      const status = isActive ? 'Đang kích hoạt' : 'Tạm dừng';

      // Cell 1: STT
      const c1 = row.getCell(1);
      c1.value = stt;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c1.border = thinBorder;

      // Cell 2: Tên tiện nghi
      const c2 = row.getCell(2);
      c2.value = name;
      c2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c2.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c2.border = thinBorder;

      // Cell 3: Loại tiện ích
      const c3 = row.getCell(3);
      c3.value = type;
      c3.alignment = { horizontal: 'center', vertical: 'middle' };
      c3.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c3.border = thinBorder;

      // Cell 4: Số lượng đang áp dụng
      const c4 = row.getCell(4);
      c4.value = appliedCount;
      c4.numFmt = '#,##0';
      c4.alignment = { horizontal: 'center', vertical: 'middle' };
      c4.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c4.border = thinBorder;

      // Cell 5: Đơn vị áp dụng
      const c5 = row.getCell(5);
      c5.value = appliedUnit;
      c5.alignment = { horizontal: 'center', vertical: 'middle' };
      c5.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c5.border = thinBorder;

      // Cell 6: Biểu phí
      const c6 = row.getCell(6);
      c6.value = pricing;
      c6.alignment = { horizontal: 'center', vertical: 'middle' };
      c6.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: isPaid ? 'FFB45309' : 'FF047857' },
      };
      c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c6.border = thinBorder;

      // Cell 7: Nổi bật
      const c7 = row.getCell(7);
      c7.value = highlight;
      c7.alignment = { horizontal: 'center', vertical: 'middle' };
      c7.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: isHighlight,
        color: { argb: isHighlight ? 'FF854D0E' : 'FF64748B' },
      };
      c7.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isHighlight ? 'FFFEF9C3' : baseBg }, // Subtle Gold Accent
      };
      c7.border = thinBorder;

      // Cell 8: Trạng thái
      const c8 = row.getCell(8);
      c8.value = status;
      c8.alignment = { horizontal: 'center', vertical: 'middle' };
      c8.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: isActive ? 'FF065F46' : 'FF991B1B' },
      };
      c8.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isActive ? 'FFECFDF5' : 'FFFEF2F2' },
      };
      c8.border = thinBorder;
    });

    // ─── 5. Table Total Footer Row ───────────────────────────────────────────
    const lastDataRow = 5 + amenities.length;
    const footerRowIndex = lastDataRow + 1;
    const footerRow = worksheet.getRow(footerRowIndex);
    footerRow.height = 24;

    worksheet.mergeCells(`A${footerRowIndex}:C${footerRowIndex}`);
    const fTitle = worksheet.getCell(`A${footerRowIndex}`);
    fTitle.value = `TỔNG CỘNG (${amenities.length} TIỆN NGHI)`;
    fTitle.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
    fTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const fCount = worksheet.getCell(`D${footerRowIndex}`);
    fCount.value = { formula: `SUM(D6:D${lastDataRow})` };
    fCount.numFmt = '#,##0';
    fCount.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    fCount.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let col = 1; col <= 8; col++) {
      const cell = footerRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'double', color: { argb: 'FF003580' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    // AutoFilter for data columns
    worksheet.autoFilter = `A5:H${lastDataRow}`;

    // ─── 6. Corporate Signature & Approval Block ────────────────────────────
    const nowSign = new Date();
    const signYear = nowSign.getFullYear();
    const signMonth = String(nowSign.getMonth() + 1).padStart(2, '0');
    const signDay = String(nowSign.getDate()).padStart(2, '0');

    const sigDateRowIndex = footerRowIndex + 2;

    worksheet.mergeCells(`E${sigDateRowIndex}:H${sigDateRowIndex}`);
    const sigDateCell = worksheet.getCell(`E${sigDateRowIndex}`);
    sigDateCell.value = `..., ngày ${signDay} tháng ${signMonth} năm ${signYear}`;
    sigDateCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF334155' } };
    sigDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigDateRowIndex).height = 20;

    const sigTitleRowIndex = sigDateRowIndex + 1;
    worksheet.mergeCells(`A${sigTitleRowIndex}:C${sigTitleRowIndex}`);
    worksheet.getCell(`A${sigTitleRowIndex}`).value = 'NGƯỜI LẬP BIỂU';
    worksheet.getCell(`A${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`A${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigTitleRowIndex}:E${sigTitleRowIndex}`);
    worksheet.getCell(`D${sigTitleRowIndex}`).value = 'NGƯỜI KIỂM SOÁT';
    worksheet.getCell(`D${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`D${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`F${sigTitleRowIndex}:H${sigTitleRowIndex}`);
    worksheet.getCell(`F${sigTitleRowIndex}`).value = 'GIÁM ĐỐC / ĐẠI DIỆN VẬN HÀNH';
    worksheet.getCell(`F${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`F${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigTitleRowIndex).height = 24;

    const sigNoteRowIndex = sigTitleRowIndex + 1;
    worksheet.mergeCells(`A${sigNoteRowIndex}:C${sigNoteRowIndex}`);
    worksheet.getCell(`A${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`A${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`A${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNoteRowIndex}:E${sigNoteRowIndex}`);
    worksheet.getCell(`D${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`D${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`D${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`F${sigNoteRowIndex}:H${sigNoteRowIndex}`);
    worksheet.getCell(`F${sigNoteRowIndex}`).value = '(Ký, đóng dấu, ghi rõ họ tên)';
    worksheet.getCell(`F${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`F${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNoteRowIndex).height = 18;

    worksheet.getRow(sigNoteRowIndex + 1).height = 18;
    worksheet.getRow(sigNoteRowIndex + 2).height = 18;
    worksheet.getRow(sigNoteRowIndex + 3).height = 18;

    const sigNameRowIndex = sigNoteRowIndex + 4;
    worksheet.mergeCells(`A${sigNameRowIndex}:C${sigNameRowIndex}`);
    worksheet.getCell(`A${sigNameRowIndex}`).value = 'Hệ thống AVORA ERP';
    worksheet.getCell(`A${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`A${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNameRowIndex}:E${sigNameRowIndex}`);
    worksheet.getCell(`D${sigNameRowIndex}`).value = 'Phòng Quản lý Dịch vụ Lưu trú';
    worksheet.getCell(`D${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`D${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`F${sigNameRowIndex}:H${sigNameRowIndex}`);
    worksheet.getCell(`F${sigNameRowIndex}`).value = 'Ban Quản lý AVORA Hotels';
    worksheet.getCell(`F${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`F${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNameRowIndex).height = 22;

    worksheet.getRow(sigNameRowIndex + 1).height = 8;
    const authRowIndex = sigNameRowIndex + 2;
    worksheet.mergeCells(`A${authRowIndex}:H${authRowIndex}`);
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

    // Header & Footer for Print Output
    worksheet.headerFooter = {
      oddHeader: '&L&B&"Segoe UI"AVORA HOTELS & RESORTS&R&"Segoe UI"Báo cáo Quản trị Tiện nghi',
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
      count: amenities.length,
      filename,
    };
  } catch (error) {
    console.error('Error generating luxury Excel report:', error);
    return {
      success: false,
      message: error.message || 'Lỗi khi tạo file Excel báo cáo.',
    };
  }
};

/**
 * Backward compatibility alias
 */
export const exportAmenitiesToCSV = exportAmenitiesToExcel;

/**
 * Export users list to Excel (.xlsx) file.
 */
export const exportUsersToExcel = async (users = [], customFilename) => {
  if (!users || users.length === 0) {
    return { success: false, message: 'Không có dữ liệu người dùng để xuất file.' };
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = customFilename || `AVORA_Danh_sach_nguoi_dung_${dateStr}.xlsx`;

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA System Management';
    workbook.lastModifiedBy = 'AVORA Executive CMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = 'Danh sách người dùng';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: {
        tabColor: { argb: 'FF003580' },
        defaultRowHeight: 22,
      },
      views: [{ state: 'normal' }],
    });

    // ─── 1. Columns Configuration ───────────────────────────────────────────
    worksheet.columns = [
      { key: 'stt', width: 8 },          // A: STT
      { key: 'code', width: 16 },         // B: Mã NV
      { key: 'name', width: 28 },         // C: Họ và tên
      { key: 'email', width: 32 },        // D: Email
      { key: 'phone', width: 18 },        // E: Số điện thoại
      { key: 'role', width: 22 },         // F: Vai trò
      { key: 'hotel', width: 30 },        // G: Cơ sở trực thuộc
      { key: 'status', width: 20 },       // H: Trạng thái
      { key: 'created_at', width: 18 },   // I: Ngày tạo
    ];

    // Common border styles
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

    worksheet.mergeCells('E1:I1');
    const brandCell = worksheet.getCell('E1');
    brandCell.value = 'HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP • AVORA ENTERPRISE';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Report Title
    worksheet.mergeCells('A2:I2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'DANH SÁCH NGƯỜI DÙNG HỆ THỐNG';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 26;

    // Row 3: Subtitle & Export Date
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A3:I3');
    const subCell = worksheet.getCell('A3');
    subCell.value = `Hotel Management System • Báo cáo quản trị tài khoản & phân quyền  |  Thời gian xuất: ${formattedDate}`;
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
      'Mã NV',
      'Họ và tên',
      'Email',
      'Số điện thoại',
      'Vai trò',
      'Cơ sở trực thuộc',
      'Trạng thái',
      'Ngày tạo',
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
    users.forEach((u, idx) => {
      const rowIndex = 6 + idx;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const isEven = idx % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Alternating zebra stripe

      const stt = idx + 1;
      const code = u.employee_code || '-';
      const name = u.full_name || 'Chưa cập nhật';
      const email = u.email || '-';
      const phone = u.phone || '-';
      const role = u.role_label || u.role_code || '-';
      const hotel = u.hotel?.name || 'Toàn hệ thống';
      const status =
        u.account_status === 'ACTIVE'
          ? 'Đang hoạt động'
          : u.account_status === 'VERIFYING'
            ? 'Chờ kích hoạt'
            : 'Đang khóa';
      const createdAt = u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '-';

      // Cell 1: STT
      const c1 = row.getCell(1);
      c1.value = stt;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c1.border = thinBorder;

      // Cell 2: Mã NV
      const c2 = row.getCell(2);
      c2.value = code;
      c2.alignment = { horizontal: 'center', vertical: 'middle' };
      c2.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c2.border = thinBorder;

      // Cell 3: Họ và tên
      const c3 = row.getCell(3);
      c3.value = name;
      c3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c3.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c3.border = thinBorder;

      // Cell 4: Email
      const c4 = row.getCell(4);
      c4.value = email;
      c4.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c4.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c4.border = thinBorder;

      // Cell 5: Số điện thoại
      const c5 = row.getCell(5);
      c5.value = phone;
      c5.alignment = { horizontal: 'center', vertical: 'middle' };
      c5.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c5.border = thinBorder;

      // Cell 6: Vai trò
      const c6 = row.getCell(6);
      c6.value = role;
      c6.alignment = { horizontal: 'center', vertical: 'middle' };
      c6.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c6.border = thinBorder;

      // Cell 7: Cơ sở trực thuộc
      const c7 = row.getCell(7);
      c7.value = hotel;
      c7.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c7.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c7.border = thinBorder;

      // Cell 8: Trạng thái
      const c8 = row.getCell(8);
      c8.value = status;
      c8.alignment = { horizontal: 'center', vertical: 'middle' };
      const isAct = u.account_status === 'ACTIVE';
      const isVer = u.account_status === 'VERIFYING';
      c8.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: isAct ? 'FF065F46' : isVer ? 'FF9A3412' : 'FF991B1B' },
      };
      c8.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isAct ? 'FFECFDF5' : isVer ? 'FFFFEDD5' : 'FFFEF2F2' },
      };
      c8.border = thinBorder;

      // Cell 9: Ngày tạo
      const c9 = row.getCell(9);
      c9.value = createdAt;
      c9.alignment = { horizontal: 'center', vertical: 'middle' };
      c9.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c9.border = thinBorder;
    });

    const lastDataRow = 5 + users.length;
    worksheet.autoFilter = `A5:I${lastDataRow}`;

    // ─── 5. Corporate Signature & Approval Block ────────────────────────────
    const nowSign = new Date();
    const signYear = nowSign.getFullYear();
    const signMonth = String(nowSign.getMonth() + 1).padStart(2, '0');
    const signDay = String(nowSign.getDate()).padStart(2, '0');

    const sigDateRowIndex = lastDataRow + 2;

    worksheet.mergeCells(`G${sigDateRowIndex}:I${sigDateRowIndex}`);
    const sigDateCell = worksheet.getCell(`G${sigDateRowIndex}`);
    sigDateCell.value = `..., ngày ${signDay} tháng ${signMonth} năm ${signYear}`;
    sigDateCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF334155' } };
    sigDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigDateRowIndex).height = 20;

    const sigTitleRowIndex = sigDateRowIndex + 1;
    worksheet.mergeCells(`A${sigTitleRowIndex}:C${sigTitleRowIndex}`);
    worksheet.getCell(`A${sigTitleRowIndex}`).value = 'NGƯỜI LẬP BÁO CÁO';
    worksheet.getCell(`A${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`A${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigTitleRowIndex}:F${sigTitleRowIndex}`);
    worksheet.getCell(`D${sigTitleRowIndex}`).value = 'TRƯỞNG PHÒNG NHÂN SỰ & IT';
    worksheet.getCell(`D${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`D${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`G${sigTitleRowIndex}:I${sigTitleRowIndex}`);
    worksheet.getCell(`G${sigTitleRowIndex}`).value = 'BAN GIÁM ĐỐC HỆ THỐNG';
    worksheet.getCell(`G${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`G${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigTitleRowIndex).height = 24;

    const sigNoteRowIndex = sigTitleRowIndex + 1;
    worksheet.mergeCells(`A${sigNoteRowIndex}:C${sigNoteRowIndex}`);
    worksheet.getCell(`A${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`A${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`A${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNoteRowIndex}:F${sigNoteRowIndex}`);
    worksheet.getCell(`D${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`D${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`D${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`G${sigNoteRowIndex}:I${sigNoteRowIndex}`);
    worksheet.getCell(`G${sigNoteRowIndex}`).value = '(Ký, đóng dấu, ghi rõ họ tên)';
    worksheet.getCell(`G${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`G${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNoteRowIndex).height = 18;

    worksheet.getRow(sigNoteRowIndex + 1).height = 18;
    worksheet.getRow(sigNoteRowIndex + 2).height = 18;
    worksheet.getRow(sigNoteRowIndex + 3).height = 18;

    const sigNameRowIndex = sigNoteRowIndex + 4;
    worksheet.mergeCells(`A${sigNameRowIndex}:C${sigNameRowIndex}`);
    worksheet.getCell(`A${sigNameRowIndex}`).value = 'Quản trị viên Hệ thống (System Admin)';
    worksheet.getCell(`A${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`A${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNameRowIndex}:F${sigNameRowIndex}`);
    worksheet.getCell(`D${sigNameRowIndex}`).value = 'Phòng Quản trị & Vận hành Nhân sự';
    worksheet.getCell(`D${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`D${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`G${sigNameRowIndex}:I${sigNameRowIndex}`);
    worksheet.getCell(`G${sigNameRowIndex}`).value = 'Ban Điều Hành AVORA Enterprise';
    worksheet.getCell(`G${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`G${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNameRowIndex).height = 22;

    worksheet.getRow(sigNameRowIndex + 1).height = 8;
    const authRowIndex = sigNameRowIndex + 2;
    worksheet.mergeCells(`A${authRowIndex}:I${authRowIndex}`);
    const authCell = worksheet.getCell(`A${authRowIndex}`);
    authCell.value = '✓ Báo cáo trích xuất tự động từ Hệ thống Quản trị Doanh nghiệp AVORA Enterprise • Bảo mật nội bộ';
    authCell.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
    authCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(authRowIndex).height = 18;

    // ─── 6. Print Layout Setup ───────────────────────────────────────────────
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
      oddHeader: '&L&B&"Segoe UI"AVORA HOTELS & RESORTS&R&"Segoe UI"Báo cáo Quản trị Người dùng',
      oddFooter: '&L&"Segoe UI"Tài liệu nội bộ AVORA • Bảo mật&R&"Segoe UI"Trang &P / &N',
    };

    // ─── 7. Write and Trigger Browser Download ───────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: users.length, filename };
  } catch (error) {
    console.error('Error exporting users to Excel:', error);
    return { success: false, message: error.message || 'Lỗi khi xuất file Excel.' };
  }
};


/**
 * Export refund policies list to Excel (.xlsx) file.
 * Matches the exact executive format, styling, and implementation of exportUsersToExcel.
 */
export const exportRefundPoliciesToExcel = async (policies = [], customFilename) => {
  if (!policies || policies.length === 0) {
    return { success: false, message: 'Không có dữ liệu chính sách hoàn tiền để xuất file.' };
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = customFilename || `AVORA_Chinh_sach_hoan_tien_${dateStr}.xlsx`;

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA System Management';
    workbook.lastModifiedBy = 'AVORA Executive CMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = 'Chính sách hoàn tiền';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: {
        tabColor: { argb: 'FF003580' },
        defaultRowHeight: 22,
      },
      views: [{ state: 'normal' }],
    });

    // ─── 1. Columns Configuration ───────────────────────────────────────────
    worksheet.columns = [
      { key: 'stt', width: 8 },          // A: STT
      { key: 'code', width: 16 },        // B: Mã CS
      { key: 'name', width: 34 },        // C: Tên chính sách
      { key: 'hotel', width: 30 },       // D: Cơ sở áp dụng
      { key: 'rate', width: 16 },        // E: Tỷ lệ hoàn (%)
      { key: 'hours', width: 22 },       // F: Hạn hủy trước check-in
      { key: 'conditions', width: 38 },  // G: Điều kiện hoàn trả
      { key: 'validity', width: 26 },    // H: Thời hạn hiệu lực
      { key: 'bookings', width: 16 },    // I: Đơn áp dụng
      { key: 'status', width: 18 },      // J: Trạng thái
      { key: 'created_at', width: 18 },  // K: Ngày tạo
    ];

    // Common border styles
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

    worksheet.mergeCells('G1:K1');
    const brandCell = worksheet.getCell('G1');
    brandCell.value = 'HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP • AVORA ENTERPRISE';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Report Title
    worksheet.mergeCells('A2:K2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'DANH MỤC CHÍNH SÁCH HOÀN TIỀN & HỦY PHÒNG';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 26;

    // Row 3: Subtitle & Export Date
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A3:K3');
    const subCell = worksheet.getCell('A3');
    subCell.value = `Marketing & Revenue Management • Báo cáo quy chế hoàn tiền & hủy phòng  |  Thời gian xuất: ${formattedDate}`;
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
      'Mã CS',
      'Tên chính sách hoàn tiền',
      'Cơ sở áp dụng',
      'Tỷ lệ hoàn (%)',
      'Hạn hủy trước check-in',
      'Điều kiện hoàn trả',
      'Thời hạn hiệu lực',
      'Đơn áp dụng',
      'Trạng thái',
      'Ngày tạo',
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
    policies.forEach((p, idx) => {
      const rowIndex = 6 + idx;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const isEven = idx % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      const fromStr = p.effective_from ? new Date(p.effective_from).toLocaleDateString('vi-VN') : 'Từ khi tạo';
      const toStr = p.effective_to ? new Date(p.effective_to).toLocaleDateString('vi-VN') : 'Vô thời hạn';
      const hours = Number(p.minimum_cancellation_hours || p.free_cancel_before_hours || 0);
      const isAct = p.status === 'ACTIVE';
      const rateVal = Number(p.refund_percentage || 0);

      // Cell 1: STT
      const c1 = row.getCell(1);
      c1.value = idx + 1;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c1.border = thinBorder;

      // Cell 2: Mã chính sách
      const c2 = row.getCell(2);
      c2.value = p.policy_code || `RP-${(p.policy_id || '').substring(0, 8).toUpperCase()}`;
      c2.alignment = { horizontal: 'center', vertical: 'middle' };
      c2.font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c2.border = thinBorder;

      // Cell 3: Tên chính sách
      const c3 = row.getCell(3);
      c3.value = p.policy_name || 'Chính sách hoàn tiền tiêu chuẩn';
      c3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      c3.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c3.border = thinBorder;

      // Cell 4: Cơ sở áp dụng
      const c4 = row.getCell(4);
      c4.value = p.hotel_name || p.hotel?.name || 'Toàn hệ thống AVORA';
      c4.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      c4.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c4.border = thinBorder;

      // Cell 5: Tỷ lệ hoàn
      const c5 = row.getCell(5);
      c5.value = `${rateVal}%`;
      c5.alignment = { horizontal: 'center', vertical: 'middle' };
      c5.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: rateVal === 100 ? 'FF065F46' : rateVal > 0 ? 'FF1D4ED8' : 'FF991B1B' },
      };
      c5.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rateVal === 100 ? 'FFECFDF5' : rateVal > 0 ? 'FFEBF5FF' : 'FFFEF2F2' },
      };
      c5.border = thinBorder;

      // Cell 6: Hạn hủy trước check-in
      const c6 = row.getCell(6);
      c6.value = hours > 0 ? `${hours} giờ trước nhận phòng` : 'Trước nhận phòng';
      c6.alignment = { horizontal: 'center', vertical: 'middle' };
      c6.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c6.border = thinBorder;

      // Cell 7: Điều kiện hoàn trả
      const c7 = row.getCell(7);
      c7.value = p.refund_conditions || p.description || 'Theo quy chuẩn nền tảng AVORA';
      c7.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      c7.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };
      c7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c7.border = thinBorder;

      // Cell 8: Thời hạn hiệu lực
      const c8 = row.getCell(8);
      c8.value = `${fromStr} - ${toStr}`;
      c8.alignment = { horizontal: 'center', vertical: 'middle' };
      c8.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
      c8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c8.border = thinBorder;

      // Cell 9: Đơn áp dụng
      const c9 = row.getCell(9);
      c9.value = Number(p.associated_bookings_count || 0);
      c9.numFmt = '#,##0';
      c9.alignment = { horizontal: 'center', vertical: 'middle' };
      c9.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c9.border = thinBorder;

      // Cell 10: Trạng thái
      const c10 = row.getCell(10);
      c10.value = isAct ? 'Đang áp dụng' : 'Tạm dừng';
      c10.alignment = { horizontal: 'center', vertical: 'middle' };
      c10.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: isAct ? 'FF065F46' : 'FF991B1B' },
      };
      c10.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isAct ? 'FFECFDF5' : 'FFFEF2F2' },
      };
      c10.border = thinBorder;

      // Cell 11: Ngày tạo
      const c11 = row.getCell(11);
      c11.value = p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '-';
      c11.alignment = { horizontal: 'center', vertical: 'middle' };
      c11.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c11.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c11.border = thinBorder;
    });

    const lastDataRow = 5 + policies.length;
    worksheet.autoFilter = `A5:K${lastDataRow}`;

    // ─── 5. Corporate Signature & Approval Block ────────────────────────────
    const nowSign = new Date();
    const signYear = nowSign.getFullYear();
    const signMonth = String(nowSign.getMonth() + 1).padStart(2, '0');
    const signDay = String(nowSign.getDate()).padStart(2, '0');

    const sigDateRowIndex = lastDataRow + 2;

    worksheet.mergeCells(`I${sigDateRowIndex}:K${sigDateRowIndex}`);
    const sigDateCell = worksheet.getCell(`I${sigDateRowIndex}`);
    sigDateCell.value = `..., ngày ${signDay} tháng ${signMonth} năm ${signYear}`;
    sigDateCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF334155' } };
    sigDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigDateRowIndex).height = 20;

    const sigTitleRowIndex = sigDateRowIndex + 1;
    worksheet.mergeCells(`A${sigTitleRowIndex}:C${sigTitleRowIndex}`);
    worksheet.getCell(`A${sigTitleRowIndex}`).value = 'NGƯỜI LẬP BÁO CÁO';
    worksheet.getCell(`A${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`A${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigTitleRowIndex}:G${sigTitleRowIndex}`);
    worksheet.getCell(`D${sigTitleRowIndex}`).value = 'TRƯỞNG PHÒNG DOANH THU & MARKETING';
    worksheet.getCell(`D${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`D${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`H${sigTitleRowIndex}:K${sigTitleRowIndex}`);
    worksheet.getCell(`H${sigTitleRowIndex}`).value = 'BAN GIÁM ĐỐC HỆ THỐNG';
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
    worksheet.getCell(`A${sigNameRowIndex}`).value = 'Quản lý Doanh nghiệp (Business Manager)';
    worksheet.getCell(`A${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`A${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNameRowIndex}:G${sigNameRowIndex}`);
    worksheet.getCell(`D${sigNameRowIndex}`).value = 'Phòng Marketing & Phát Triển Doanh Thu';
    worksheet.getCell(`D${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`D${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`H${sigNameRowIndex}:K${sigNameRowIndex}`);
    worksheet.getCell(`H${sigNameRowIndex}`).value = 'Ban Điều Hành AVORA Enterprise';
    worksheet.getCell(`H${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`H${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNameRowIndex).height = 22;

    // ─── 6. Page Setup for Printing ──────────────────────────────────────────
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
      oddHeader: '&L&B&"Segoe UI"AVORA HOTELS & RESORTS&R&"Segoe UI"Báo cáo Quản trị Chính sách Hoàn tiền',
      oddFooter: '&L&"Segoe UI"Tài liệu nội bộ AVORA • Bảo mật&R&"Segoe UI"Trang &P / &N',
    };

    // ─── 7. Write and Trigger Browser Download ───────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: policies.length, filename };
  } catch (error) {
    console.error('Error exporting refund policies to Excel:', error);
    return { success: false, message: error.message || 'Lỗi khi xuất file Excel.' };
  }
};

