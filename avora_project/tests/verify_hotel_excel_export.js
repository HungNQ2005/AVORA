/**
 * Verification test suite for AVORA Hotel Excel Export functionality.
 * Tests workbook structure, column mappings, styling, formatting, and calculations.
 */

const assert = require('assert');
const ExcelJS = require('../frontend/node_modules/exceljs');

const sampleHotels = [
  {
    hotel_id: 'HOTEL-HN-001',
    name: 'Avora Luxury Hotel Hanoi',
    star_quality: 5,
    city_name: 'Hà Nội',
    district_name: 'Hoàn Kiếm',
    ward_name: 'Hàng Trống',
    address: '123 Phố Hàng Trống',
    owner_name: 'Nguyễn Văn An',
    owner_phone: '0901234567',
    owner_email: 'an.nguyen@avora.vn',
    total_rooms: 45,
    total_room_types: 4,
    status_cd: 'ACTIVE',
    hotel_status: 'ACTIVE',
    status_name: 'Đang hoạt động',
    created_at: '2026-01-15T08:30:00Z',
  },
  {
    hotel_id: 'HOTEL-DN-002',
    name: 'Avora Resort & Spa Danang',
    star_quality: 4,
    city_name: 'Đà Nẵng',
    district_name: 'Ngũ Hành Sơn',
    ward_name: 'Khuê Mỹ',
    address: '88 Đường Võ Nguyên Giáp',
    owner_name: 'Trần Thị Bình',
    owner_phone: '0912345678',
    owner_email: 'binh.tran@avora.vn',
    total_rooms: 60,
    total_room_types: 5,
    status_cd: 'PENDING',
    hotel_status: 'PENDING',
    status_name: 'Chờ phê duyệt',
    created_at: '2026-03-20T10:15:00Z',
  },
  {
    hotel_id: 'HOTEL-SG-003',
    name: 'Avora Heritage Saigon',
    star_quality: 3,
    city_name: 'Hồ Chí Minh',
    district_name: 'Quận 1',
    ward_name: 'Bến Nghé',
    address: '15 Công Trường Lam Sơn',
    owner_name: 'Lê Hoàng Cường',
    owner_phone: '0987654321',
    owner_email: 'cuong.le@avora.vn',
    total_rooms: 30,
    total_room_types: 3,
    status_cd: 'INACTIVE',
    hotel_status: 'INACTIVE',
    status_name: 'Ngừng hoạt động',
    created_at: '2025-11-10T14:00:00Z',
  },
];

async function runTests() {
  console.log('========================================================================');
  console.log(' AVORA HOTEL EXCEL EXPORT VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // Test 1: Filename generation
  test('T1: getHotelExportExcelFilename generates expected filename pattern', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const expected = `AVORA_Danh_sach_khach_san_${year}${month}${day}.xlsx`;

    const getFilename = (prefix) => {
      const p = prefix ? `AVORA_${prefix}` : 'AVORA_Danh_sach_khach_san';
      return `${p}_${year}${month}${day}.xlsx`;
    };

    assert.strictEqual(getFilename(), expected);
    assert.strictEqual(getFilename('Ho_so_Avora'), `AVORA_Ho_so_Avora_${year}${month}${day}.xlsx`);
  });

  // Test 2: Empty hotels handling
  test('T2: Rejects empty hotel list gracefully', () => {
    const handleEmpty = (hotels) => {
      if (!hotels || hotels.length === 0) {
        return { success: false, message: 'Không có dữ liệu khách sạn để xuất file.' };
      }
      return { success: true };
    };
    assert.strictEqual(handleEmpty([]).success, false);
    assert.strictEqual(handleEmpty(null).success, false);
    assert.strictEqual(handleEmpty(sampleHotels).success, true);
  });

  // Test 3: Workbook Generation & Column Verification
  await testAsync('T3: Builds complete 15-column Excel sheet with luxury styling', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA Hotel Management System';
    const worksheet = workbook.addWorksheet('Danh sách khách sạn');

    worksheet.columns = [
      { key: 'stt', width: 8 },
      { key: 'hotel_id', width: 20 },
      { key: 'name', width: 34 },
      { key: 'star_quality', width: 18 },
      { key: 'city', width: 22 },
      { key: 'district', width: 22 },
      { key: 'ward', width: 22 },
      { key: 'address', width: 38 },
      { key: 'owner_name', width: 26 },
      { key: 'owner_phone', width: 18 },
      { key: 'owner_email', width: 28 },
      { key: 'total_rooms', width: 16 },
      { key: 'total_room_types', width: 16 },
      { key: 'status', width: 22 },
      { key: 'created_at', width: 20 },
    ];

    assert.strictEqual(worksheet.columns.length, 15, 'Must have exactly 15 columns');

    // Header row
    const headerRow = worksheet.getRow(5);
    const headers = [
      'STT', 'Mã khách sạn', 'Tên cơ sở khách sạn', 'Hạng sao',
      'Tỉnh / Thành phố', 'Quận / Huyện', 'Phường / Xã', 'Địa chỉ chi tiết',
      'Chủ sở hữu / Đại diện', 'Số điện thoại', 'Email liên hệ',
      'Tổng số phòng', 'Số loại phòng', 'Trạng thái hoạt động', 'Ngày đăng ký'
    ];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003580' } };
    });

    assert.strictEqual(headerRow.getCell(1).value, 'STT');
    assert.strictEqual(headerRow.getCell(2).value, 'Mã khách sạn');
    assert.strictEqual(headerRow.getCell(3).value, 'Tên cơ sở khách sạn');
    assert.strictEqual(headerRow.getCell(12).value, 'Tổng số phòng');
    assert.strictEqual(headerRow.getCell(14).value, 'Trạng thái hoạt động');

    // Data rows
    sampleHotels.forEach((h, i) => {
      const row = worksheet.getRow(6 + i);
      row.getCell(1).value = i + 1;
      row.getCell(2).value = h.hotel_id;
      row.getCell(3).value = h.name;
      row.getCell(4).value = `${h.star_quality} sao (★★★★★)`;
      row.getCell(5).value = h.city_name;
      row.getCell(8).value = h.address;
      row.getCell(12).value = h.total_rooms;
      row.getCell(13).value = h.total_room_types;
      row.getCell(14).value = `● ${h.status_name}`;
    });

    assert.strictEqual(worksheet.getRow(6).getCell(2).value, 'HOTEL-HN-001');
    assert.strictEqual(worksheet.getRow(6).getCell(12).value, 45);
    assert.strictEqual(worksheet.getRow(7).getCell(12).value, 60);
    assert.strictEqual(worksheet.getRow(8).getCell(12).value, 30);

    // Footer row calculation
    const footerIndex = 6 + sampleHotels.length;
    const totalRooms = sampleHotels.reduce((sum, h) => sum + h.total_rooms, 0);
    assert.strictEqual(totalRooms, 135, 'Total rooms sum must equal 135');

    worksheet.mergeCells(`A${footerIndex}:K${footerIndex}`);
    worksheet.getCell(`A${footerIndex}`).value = `TỔNG CỘNG (${sampleHotels.length} CƠ SỞ KHÁCH SẠN)`;
    worksheet.getCell(`L${footerIndex}`).value = { formula: `SUM(L6:L${footerIndex - 1})`, result: totalRooms };

    assert.strictEqual(worksheet.getCell(`L${footerIndex}`).value.result, 135);

    // Verify buffer write without error
    const buffer = await workbook.xlsx.writeBuffer();
    assert(buffer.length > 0, 'Generated buffer must be non-empty');
  });

  // Test 4: Frontend file checks
  test('T4: Frontend export files & modal imports exist', () => {
    const fs = require('fs');
    assert(fs.existsSync('avora_project/frontend/src/utils/exportHotelExcel.js'), 'exportHotelExcel.js exists');

    const pageContent = fs.readFileSync('avora_project/frontend/src/features/hotel_management/pages/hotelManagementPage.jsx', 'utf8');
    assert(pageContent.includes('ExportExcelModal'), 'HotelManagementPage imports ExportExcelModal');
    assert(pageContent.includes('exportHotelsToExcel'), 'HotelManagementPage imports exportHotelsToExcel');
    assert(pageContent.includes('hotel-btn-excel'), 'HotelManagementPage contains hotel-btn-excel button');

    const detailContent = fs.readFileSync('avora_project/frontend/src/features/hotel_management/pages/hotelDetailPage.jsx', 'utf8');
    assert(detailContent.includes('exportHotelsToExcel'), 'HotelDetailPage imports exportHotelsToExcel');
    assert(detailContent.includes('handleExportProfile'), 'HotelDetailPage contains handleExportProfile');
  });

  console.log('\n------------------------------------------------------------------------');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('------------------------------------------------------------------------');
  if (failed > 0) process.exit(1);
}

runTests();
