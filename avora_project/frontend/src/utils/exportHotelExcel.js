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
 * Generate standard hotel export filename with current timestamp (YYYYMMDD).
 * e.g., AVORA_Danh_sach_khach_san_20261108.xlsx
 */
export const getHotelExportExcelFilename = (customPrefix) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = customPrefix ? `AVORA_${customPrefix}` : 'AVORA_Danh_sach_khach_san';
  return `${prefix}_${year}${month}${day}.xlsx`;
};

const formatStarLabel = (stars) => {
  const num = Number(stars);
  if (!Number.isFinite(num) || num <= 0) return 'Chưa xếp hạng';
  const starIcons = '★'.repeat(Math.min(Math.max(Math.round(num), 1), 5));
  return `${num} sao (${starIcons})`;
};

const getHotelStatusInfo = (hotel) => {
  if (hotel.is_deleted) {
    return { label: 'Đã xóa / Ngừng hoạt động', textArgb: 'FFDC2626', bgArgb: 'FFFEF2F2' };
  }
  const statusCd = String(hotel.status_cd || hotel.hotel_status || 'ACTIVE').toUpperCase();
  switch (statusCd) {
    case 'ACTIVE':
      return { label: 'Đang hoạt động', textArgb: 'FF059669', bgArgb: 'FFECFDF5' };
    case 'PENDING':
      return { label: 'Chờ phê duyệt', textArgb: 'FFD97706', bgArgb: 'FFFFFBEB' };
    case 'INACTIVE':
      return { label: 'Ngừng hoạt động', textArgb: 'FFE11D48', bgArgb: 'FFFFF1F2' };
    default:
      return { label: hotel.status_name || statusCd, textArgb: 'FF475569', bgArgb: 'FFF1F5F9' };
  }
};

const formatDisplayDate = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(isoString);
  }
};

/**
 * Export hotels list to a luxury, executive-grade Excel (.xlsx) report
 * adhering to the AVORA Midnight Navy & Gold Luxury Hospitality Design System.
 *
 * @param {Array} hotels - List of hotel objects
 * @param {string} [customFilename] - Optional override filename
 * @param {object} [contextInfo] - Additional context e.g. filter/scope title
 * @returns {Promise<{ success: boolean, count?: number, filename?: string, message?: string }>}
 */
export const exportHotelsToExcel = async (
  hotels = [],
  customFilename,
  contextInfo = {}
) => {
  if (!hotels || hotels.length === 0) {
    return { success: false, message: 'Không có dữ liệu khách sạn để xuất file.' };
  }

  const filename = customFilename || getHotelExportExcelFilename();

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA Hotel Management System';
    workbook.lastModifiedBy = 'AVORA Executive CMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = 'Danh sách khách sạn';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: {
        tabColor: { argb: 'FF003580' },
        defaultRowHeight: 22,
      },
      views: [{ state: 'normal' }],
    });

    // ─── 1. Columns Configuration ───────────────────────────────────────────
    worksheet.columns = [
      { key: 'stt', width: 8 },             // A: STT
      { key: 'hotel_id', width: 20 },        // B: Mã định danh khách sạn
      { key: 'name', width: 34 },            // C: Tên khách sạn
      { key: 'star_quality', width: 18 },    // D: Hạng sao
      { key: 'city', width: 22 },            // E: Tỉnh / Thành phố
      { key: 'district', width: 22 },        // F: Quận / Huyện
      { key: 'ward', width: 22 },            // G: Phường / Xã
      { key: 'address', width: 38 },         // H: Địa chỉ chi tiết
      { key: 'owner_name', width: 26 },      // I: Chủ sở hữu / Đại diện
      { key: 'owner_phone', width: 18 },     // J: Số điện thoại
      { key: 'owner_email', width: 28 },     // K: Email liên hệ
      { key: 'total_rooms', width: 16 },     // L: Tổng số phòng
      { key: 'total_room_types', width: 16 },// M: Số loại phòng
      { key: 'status', width: 22 },          // N: Trạng thái hoạt động
      { key: 'created_at', width: 20 },      // O: Ngày khởi tạo
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
    try {
      const logoBase64 = await getAvoraLogoBase64();
      if (logoBase64) {
        const cleanBase64 = logoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const logoId = workbook.addImage({
          base64: cleanBase64,
          extension: 'png',
        });
        worksheet.addImage(logoId, {
          tl: { col: 0.1, row: 0.1 },
          ext: { width: 135, height: 36 },
        });
      }
    } catch (logoErr) {
      console.warn('Could not add logo to Excel report, continuing without logo:', logoErr);
    }

    worksheet.mergeCells('H1:O1');
    const brandCell = worksheet.getCell('H1');
    brandCell.value = 'HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP • AVORA ENTERPRISE';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Report Title
    worksheet.mergeCells('A2:O2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = contextInfo.title || 'DANH SÁCH CƠ SỞ LƯU TRÚ & KHÁCH SẠN';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 26;

    // Row 3: Subtitle & Metadata
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A3:O3');
    const subCell = worksheet.getCell('A3');
    subCell.value = `Hotel Management System • Báo cáo quản trị hệ thống cơ sở lưu trú  |  Thời gian xuất: ${formattedDate}  |  Tổng số: ${hotels.length} khách sạn`;
    subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(3).height = 18;

    // Row 4: Clean Spacing Row
    worksheet.getRow(4).height = 6;

    // ─── 3. Table Header (Row 5) ─────────────────────────────────────────────
    const headerRow = worksheet.getRow(5);
    headerRow.height = 28;

    const headers = [
      'STT',
      'Mã khách sạn',
      'Tên cơ sở khách sạn',
      'Hạng sao',
      'Tỉnh / Thành phố',
      'Quận / Huyện',
      'Phường / Xã',
      'Địa chỉ chi tiết',
      'Chủ sở hữu / Đại diện',
      'Số điện thoại',
      'Email liên hệ',
      'Tổng số phòng',
      'Số loại phòng',
      'Trạng thái hoạt động',
      'Ngày đăng ký',
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
    hotels.forEach((hotel, index) => {
      const rowIndex = 6 + index;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const isEven = index % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      const stt = index + 1;
      const hotelId = String(hotel.hotel_id || '—');
      const hotelName = String(hotel.name || 'Chưa đặt tên');
      const starQuality = formatStarLabel(hotel.star_quality ?? hotel.star_rating);
      const cityName = hotel.city_name || hotel.city?.city_name || '—';
      const districtName = hotel.district_name || hotel.district?.district_name || '—';
      const wardName = hotel.ward_name || hotel.ward?.ward_name || '—';
      const address = hotel.address || '—';
      const ownerName = hotel.owner_name || hotel.owner?.full_name || '—';
      const ownerPhone = hotel.owner_phone || hotel.owner?.phone || '—';
      const ownerEmail = hotel.owner_email || hotel.owner?.email || '—';
      const totalRooms = Number(hotel.total_rooms ?? hotel.room_count ?? (Array.isArray(hotel.rooms) ? hotel.rooms[0]?.count : 0) ?? 0);
      const totalRoomTypes = Number(hotel.total_room_types ?? (Array.isArray(hotel.room_types) ? hotel.room_types.length : (hotel.room_type_summary?.[0]?.count ?? 0)) ?? 0);
      const statusInfo = getHotelStatusInfo(hotel);
      const createdAt = formatDisplayDate(hotel.created_at);

      // Cell 1: STT
      const c1 = row.getCell(1);
      c1.value = stt;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c1.border = thinBorder;

      // Cell 2: Mã khách sạn
      const c2 = row.getCell(2);
      c2.value = hotelId;
      c2.alignment = { horizontal: 'center', vertical: 'middle' };
      c2.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c2.border = thinBorder;

      // Cell 3: Tên khách sạn
      const c3 = row.getCell(3);
      c3.value = hotelName;
      c3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c3.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c3.border = thinBorder;

      // Cell 4: Hạng sao
      const c4 = row.getCell(4);
      c4.value = starQuality;
      c4.alignment = { horizontal: 'center', vertical: 'middle' };
      c4.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FFB45309' }, bold: true };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c4.border = thinBorder;

      // Cell 5: Tỉnh / Thành phố
      const c5 = row.getCell(5);
      c5.value = cityName;
      c5.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      c5.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c5.border = thinBorder;

      // Cell 6: Quận / Huyện
      const c6 = row.getCell(6);
      c6.value = districtName;
      c6.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      c6.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c6.border = thinBorder;

      // Cell 7: Phường / Xã
      const c7 = row.getCell(7);
      c7.value = wardName;
      c7.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      c7.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c7.border = thinBorder;

      // Cell 8: Địa chỉ chi tiết
      const c8 = row.getCell(8);
      c8.value = address;
      c8.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c8.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c8.border = thinBorder;

      // Cell 9: Chủ sở hữu
      const c9 = row.getCell(9);
      c9.value = ownerName;
      c9.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      c9.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c9.border = thinBorder;

      // Cell 10: Số điện thoại
      const c10 = row.getCell(10);
      c10.value = ownerPhone;
      c10.alignment = { horizontal: 'center', vertical: 'middle' };
      c10.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c10.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c10.border = thinBorder;

      // Cell 11: Email liên hệ
      const c11 = row.getCell(11);
      c11.value = ownerEmail;
      c11.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      c11.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF2563EB' } };
      c11.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c11.border = thinBorder;

      // Cell 12: Tổng số phòng
      const c12 = row.getCell(12);
      c12.value = totalRooms;
      c12.numFmt = '#,##0';
      c12.alignment = { horizontal: 'right', vertical: 'middle' };
      c12.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c12.border = thinBorder;

      // Cell 13: Số loại phòng
      const c13 = row.getCell(13);
      c13.value = totalRoomTypes;
      c13.numFmt = '#,##0';
      c13.alignment = { horizontal: 'right', vertical: 'middle' };
      c13.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c13.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c13.border = thinBorder;

      // Cell 14: Trạng thái
      const c14 = row.getCell(14);
      c14.value = `● ${statusInfo.label}`;
      c14.alignment = { horizontal: 'center', vertical: 'middle' };
      c14.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: statusInfo.textArgb } };
      c14.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusInfo.bgArgb } };
      c14.border = thinBorder;

      // Cell 15: Ngày khởi tạo
      const c15 = row.getCell(15);
      c15.value = createdAt;
      c15.alignment = { horizontal: 'center', vertical: 'middle' };
      c15.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
      c15.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c15.border = thinBorder;
    });

    // ─── 5. Table Total Footer Row ───────────────────────────────────────────
    const lastDataRow = 5 + hotels.length;
    const footerRowIndex = lastDataRow + 1;
    const footerRow = worksheet.getRow(footerRowIndex);
    footerRow.height = 24;

    worksheet.mergeCells(`A${footerRowIndex}:K${footerRowIndex}`);
    const fTitle = worksheet.getCell(`A${footerRowIndex}`);
    fTitle.value = `TỔNG CỘNG (${hotels.length} CƠ SỞ KHÁCH SẠN) • TỔNG QUY MÔ BUỒNG PHÒNG HỆ THỐNG`;
    fTitle.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
    fTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const totalRoomsSum = hotels.reduce((acc, h) => acc + Number(h.total_rooms ?? h.room_count ?? (Array.isArray(h.rooms) ? h.rooms[0]?.count : 0) ?? 0), 0);
    const fRooms = worksheet.getCell(`L${footerRowIndex}`);
    fRooms.value = { formula: `SUM(L6:L${lastDataRow})`, result: totalRoomsSum };
    fRooms.numFmt = '#,##0';
    fRooms.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    fRooms.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalRoomTypesSum = hotels.reduce((acc, h) => acc + Number(h.total_room_types ?? (Array.isArray(h.room_types) ? h.room_types.length : (h.room_type_summary?.[0]?.count ?? 0)) ?? 0), 0);
    const fTypes = worksheet.getCell(`M${footerRowIndex}`);
    fTypes.value = { formula: `SUM(M6:M${lastDataRow})`, result: totalRoomTypesSum };
    fTypes.numFmt = '#,##0';
    fTypes.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    fTypes.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let col = 1; col <= 15; col++) {
      const cell = footerRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'double', color: { argb: 'FF003580' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    worksheet.autoFilter = `A5:O${lastDataRow}`;

    // ─── 6. Corporate Signature & Approval Block ────────────────────────────
    const nowSign = new Date();
    const signYear = nowSign.getFullYear();
    const signMonth = String(nowSign.getMonth() + 1).padStart(2, '0');
    const signDay = String(nowSign.getDate()).padStart(2, '0');

    const sigDateRowIndex = footerRowIndex + 2;

    worksheet.mergeCells(`K${sigDateRowIndex}:O${sigDateRowIndex}`);
    const sigDateCell = worksheet.getCell(`K${sigDateRowIndex}`);
    sigDateCell.value = `..., ngày ${signDay} tháng ${signMonth} năm ${signYear}`;
    sigDateCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF334155' } };
    sigDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigDateRowIndex).height = 20;

    const sigTitleRowIndex = sigDateRowIndex + 1;
    worksheet.mergeCells(`A${sigTitleRowIndex}:D${sigTitleRowIndex}`);
    worksheet.getCell(`A${sigTitleRowIndex}`).value = 'NGƯỜI LẬP BIỂU';
    worksheet.getCell(`A${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`A${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`E${sigTitleRowIndex}:J${sigTitleRowIndex}`);
    worksheet.getCell(`E${sigTitleRowIndex}`).value = 'QUẢN LÝ VẬN HÀNH HỆ THỐNG KHÁCH SẠN';
    worksheet.getCell(`E${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`E${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`K${sigTitleRowIndex}:O${sigTitleRowIndex}`);
    worksheet.getCell(`K${sigTitleRowIndex}`).value = 'BAN GIÁM ĐỐC / ĐẠI DIỆN AVORA ENTERPRISE';
    worksheet.getCell(`K${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`K${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigTitleRowIndex).height = 24;

    const sigNoteRowIndex = sigTitleRowIndex + 1;
    worksheet.mergeCells(`A${sigNoteRowIndex}:D${sigNoteRowIndex}`);
    worksheet.getCell(`A${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`A${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`A${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`E${sigNoteRowIndex}:J${sigNoteRowIndex}`);
    worksheet.getCell(`E${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`E${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`E${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`K${sigNoteRowIndex}:O${sigNoteRowIndex}`);
    worksheet.getCell(`K${sigNoteRowIndex}`).value = '(Ký, đóng dấu, ghi rõ họ tên)';
    worksheet.getCell(`K${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`K${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNoteRowIndex).height = 18;

    worksheet.getRow(sigNoteRowIndex + 1).height = 18;
    worksheet.getRow(sigNoteRowIndex + 2).height = 18;
    worksheet.getRow(sigNoteRowIndex + 3).height = 18;

    const sigNameRowIndex = sigNoteRowIndex + 4;
    worksheet.mergeCells(`A${sigNameRowIndex}:D${sigNameRowIndex}`);
    worksheet.getCell(`A${sigNameRowIndex}`).value = 'Hệ thống AVORA ERP';
    worksheet.getCell(`A${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`A${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`E${sigNameRowIndex}:J${sigNameRowIndex}`);
    worksheet.getCell(`E${sigNameRowIndex}`).value = 'Phòng Quản lý Dịch vụ Lưu trú';
    worksheet.getCell(`E${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`E${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`K${sigNameRowIndex}:O${sigNameRowIndex}`);
    worksheet.getCell(`K${sigNameRowIndex}`).value = 'Ban Quản lý AVORA Hotels';
    worksheet.getCell(`K${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`K${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNameRowIndex).height = 22;

    worksheet.getRow(sigNameRowIndex + 1).height = 8;
    const authRowIndex = sigNameRowIndex + 2;
    worksheet.mergeCells(`A${authRowIndex}:O${authRowIndex}`);
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
      oddHeader: '&L&B&"Segoe UI"AVORA HOTELS & RESORTS&R&"Segoe UI"Báo cáo Quản trị Khách sạn',
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
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 2000);

    return {
      success: true,
      count: hotels.length,
      filename,
    };
  } catch (error) {
    console.error('Error generating luxury Hotel Excel report:', error);
    return {
      success: false,
      message: error.message || 'Lỗi khi tạo file Excel báo cáo khách sạn.',
    };
  }
};

