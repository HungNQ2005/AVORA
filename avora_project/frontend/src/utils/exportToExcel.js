import ExcelJS from 'exceljs';

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
 * Designed for AVORA Hotel Management with full branding, KPI summary, and visual hierarchy.
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
      views: [
        {
          state: 'frozen',
          xSplit: 0,
          ySplit: 10,
          topLeftCell: 'A11',
          activeCell: 'A11',
        },
      ],
    });

    // ─── 1. Columns Configuration ───────────────────────────────────────────
    worksheet.columns = [
      { key: 'stt', width: 8 },           // A: STT
      { key: 'name', width: 34 },          // B: Tên tiện nghi
      { key: 'type', width: 22 },          // C: Loại tiện ích
      { key: 'applied_count', width: 20 }, // D: Số lượng đang áp dụng
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
    worksheet.getRow(1).height = 10;

    // A2: Brand Tagline
    worksheet.mergeCells('A2:H2');
    const brandCell = worksheet.getCell('A2');
    brandCell.value = 'AVORA HOTELS & RESORTS';
    brandCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 18;

    // A3: Report Title
    worksheet.mergeCells('A3:H3');
    const titleCell = worksheet.getCell('A3');
    titleCell.value = 'DANH MỤC TIỆN NGHI KHÁCH SẠN';
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(3).height = 26;

    // A4: Subtitle / System
    worksheet.mergeCells('A4:H4');
    const subCell = worksheet.getCell('A4');
    subCell.value = 'Hotel Management System • Báo cáo quản trị lưu trú nội bộ';
    subCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(4).height = 18;

    // A5: Export Date
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A5:H5');
    const dateCell = worksheet.getCell('A5');
    dateCell.value = `Thời gian xuất báo cáo: ${formattedDate}`;
    dateCell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };
    dateCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(5).height = 18;

    worksheet.getRow(6).height = 8;

    // ─── 3. Report Summary KPI Cards (Row 7 & 8) ─────────────────────────────
    const totalCount = amenities.length;
    const activeCount = amenities.filter((a) => Boolean(a.is_active)).length;
    const inactiveCount = totalCount - activeCount;

    worksheet.getRow(7).height = 18;
    worksheet.getRow(8).height = 24;

    const setCard = (col1, col2, title, val, titleBg, titleColor, valBg, valColor, borderColor) => {
      worksheet.mergeCells(`${col1}7:${col2}7`);
      worksheet.mergeCells(`${col1}8:${col2}8`);

      const tCell = worksheet.getCell(`${col1}7`);
      tCell.value = title;
      tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: titleBg } };
      tCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: titleColor } };
      tCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const vCell = worksheet.getCell(`${col1}8`);
      vCell.value = val;
      vCell.numFmt = '#,##0';
      vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: valBg } };
      vCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: valColor } };
      vCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Apply borders to merged area
      [col1, col2].forEach((c) => {
        worksheet.getCell(`${c}7`).border = {
          top: { style: 'thin', color: { argb: borderColor } },
          left: c === col1 ? { style: 'thin', color: { argb: borderColor } } : undefined,
          right: c === col2 ? { style: 'thin', color: { argb: borderColor } } : undefined,
        };
        worksheet.getCell(`${c}8`).border = {
          bottom: { style: 'thin', color: { argb: borderColor } },
          left: c === col1 ? { style: 'thin', color: { argb: borderColor } } : undefined,
          right: c === col2 ? { style: 'thin', color: { argb: borderColor } } : undefined,
        };
      });
    };

    // Card 1: Tổng tiện nghi (B7:C8)
    setCard('B', 'C', 'TỔNG TIỆN NGHI', totalCount, 'FFF1F5F9', 'FF475569', 'FFF8FAFC', 'FF003580', 'FFCBD5E1');

    // Card 2: Đang kích hoạt (D7:E8)
    setCard('D', 'E', 'ĐANG KÍCH HOẠT', activeCount, 'FFECFDF5', 'FF065F46', 'FFF0FDF4', 'FF047857', 'FFA7F3D0');

    // Card 3: Tạm dừng (F7:G8)
    setCard('F', 'G', 'TẠM DỪNG', inactiveCount, 'FFFEF2F2', 'FF991B1B', 'FFFFF5F5', 'FFB91C1C', 'FFFECACA');

    worksheet.getRow(9).height = 12;

    // ─── 4. Table Header (Row 10) ────────────────────────────────────────────
    const headerRow = worksheet.getRow(10);
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

    // ─── 5. Data Rows (Row 11+) ──────────────────────────────────────────────
    amenities.forEach((item, index) => {
      const rowIndex = 11 + index;
      const row = worksheet.getRow(rowIndex);
      row.height = 22;

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

    // ─── 6. Table Total Footer Row ───────────────────────────────────────────
    const lastDataRow = 10 + amenities.length;
    const footerRowIndex = lastDataRow + 1;
    const footerRow = worksheet.getRow(footerRowIndex);
    footerRow.height = 24;

    worksheet.mergeCells(`A${footerRowIndex}:C${footerRowIndex}`);
    const fTitle = worksheet.getCell(`A${footerRowIndex}`);
    fTitle.value = `TỔNG CỘNG (${amenities.length} TIỆN NGHI)`;
    fTitle.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
    fTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const fCount = worksheet.getCell(`D${footerRowIndex}`);
    fCount.value = { formula: `SUM(D11:D${lastDataRow})` };
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

    // ─── 7. Excel Advanced Features ──────────────────────────────────────────
    // AutoFilter for data columns
    worksheet.autoFilter = `A10:H${lastDataRow}`;

    // Page Setup for Printing (Landscape, fit to page width, A4)
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
