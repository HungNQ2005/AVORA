# Support Tickets and Hotel Bookings — Requirement Questions

Please answer the questions below in place. If a default is acceptable, write “Use suggested default.”

## What I found in the project

- The backend has authenticated booking routes, including `/bookings/my` and `/bookings/:id`, but no support-ticket routes or services were found.
- The frontend has a customer My Bookings page, a vendor/admin dashboard, and a support banner on My Bookings. Its current “Chat với CSKH” action opens the AI chat widget (or an alert), not a ticket conversation.
- Dashboard access is role-based: `CUS` (customer), `VEN` (vendor), `ADM` (system admin), and `BMR` (business manager). Hotel-management routes distinguish vendors from system admins.
- The provided schema defines `t_support_ticket` and `t_support_ticket_reply`. Tickets support requester, optional hotel/booking associations, type/status/priority, initial attachments, admin assignment and resolution metadata. Replies support attachments and an `is_internal_note` flag.
- `Support Ticket Module.txt` includes suggested `SUPPORT_STS` and `SUPPORT_CAT` code seeds. The current `m_system_codes.md` listing does not show these codes, so their deployed state and final values need confirmation.
- Existing uploads use Supabase Storage for hotel images and avatars; no support-attachment bucket or support-file policy was found.

## 1. Roles and access

1. Which roles may create tickets: customers (`CUS`), vendors (`VEN`), both, or other roles?
   - **Answer:** Ticket là một dạng phiếu hỗ trợ cho người dùng tới Admin để thực hiện trao đổi hỗ trợ những trường hợp (xem lại Avora_main_schemas.sql để biết thêm thông tin chi tiết):
   - **Nhóm khách hàng và thanh toán:**
       + ('SUPPORT_CAT', '1', 'PWC', 1), -- PWC: Pay Wrong Code (Sai cú pháp)
       + ('SUPPORT_CAT', '2', 'PWA', 2), -- PWA: Pay Wrong Amount (Sai số tiền)
       + ('SUPPORT_CAT', '3', 'PTO', 3), -- PTO: Pay Timeout (Thanh toán quá hạn)
       + ('SUPPORT_CAT', '4', 'RFD', 4), -- RFD: Refund (Yêu cầu hoàn tiền)
       + ('SUPPORT_CAT', '5', 'BKI', 5), -- BKI: Booking Issue (Vấn đề đơn hàng)
   - **Nhóm Vendor và khách sạn:**
       + ('SUPPORT_CAT', '6', 'VBU', 6), -- VBU: Vendor Bank Update (Cập nhật ngân hàng)
       + ('SUPPORT_CAT', '7', 'VIU', 7), -- VIU: Vendor Info Update (Cập nhật thông tin)
       + ('SUPPORT_CAT', '8', 'VPO', 8), -- VPO: Vendor Policy (Hỏi về chính sách/hoa hồng)
   - Theo đó các nghiệp vụ liên quan sẽ được trực tiếp trao đổi với Admin (System Admin) để được hỗ trợ hoặc thông qua chat AI trong khoản thời gian chờ Admin phản hồi.
    
2. Which roles may view ticket lists and details?
   - Customer: own tickets only?
   - Vendor: own tickets only, tickets connected to their hotels, or both?
   - System admin (`ADM`): all tickets?
   - Business manager (`BMR`): no access, read-only access, or ticket handling access?
   - **Answer:** Các ticket được sở hữu dưới dạng chỉ có bản thân mới sở hữu ticket của bản thân tạo và không thể được truy cập bằng tài khoản khác, tất nhiên điều này khác với Admin vì Admin là người phản hồi và hỗ trợ các ticket này.
       + Theo đó, các ticket được sở hữu bởi Customer không thể có SUPPORT_CAT thuộc nhóm của Vendor và khách sạn, tuy nhiên Vendor vẫn có thể sở hữu SUPPORT_CAT thuộc nhóm khách hàng và thanh toán vì Vendor vẫn có quyền được xem như là một customer, điều này cần được validate kỹ ở Frontend và Backend
       + Business manager không tham gia vào chức năng này trừ việc cũng có quyền sử dụng các SUPPORT_CAT nhóm khách hàng và thanh toán.

3. May a vendor view bookings only for hotels they own? Should system admins also be able to view hotel bookings? Should customers see their own booking list here, or should the existing My Bookings page remain the only customer booking list?
   - **Answer:** Vendor chỉ có thể xem các đơn Book thuộc khách sạn họ quản lý, customer không có quyền truy cập vào dashboard nên list My Bookings của Customer vẫn sẽ trong My Bookings page hiện tại của dự án. Việc quản lý khách sạn hoàn toàn thuộc phía Vendor nên như hiện tại System Admin cũng sẽ chỉ có thể xem và duyệt xóa/mở chứ không có thể thực hiện các quyền chỉnh sửa khách như Vendor

4. For a ticket linked to a booking or hotel, should access be restricted to the booking owner / hotel owner, in addition to the ticket requester and admins?
   - **Answer:** không, quyền truy cập ticket chỉ diễn ra giữa System Admin và người tạo ticket đó và không thể truy cập theo bất kỳ cách nào khác.

5. Should admins be able to assign tickets to themselves or another admin? Is assignment required before responding or changing status?
   - **Answer:** Các ticket có thể được phản hồi bởi bất kỳ admin nào vào thời gian đó và một khi admin đó nhận phản hồi hỗ trợ, admin sẽ trở thành người thụ lý và chịu trách nhiệm cho việc hỗ trợ này (sau khi đã xác nhận Admin thụ lý, ticket sẽ bị khóa truy cập giữa người tạo ticket và admin đó, validate frontend lẫn backend). Tuy vậy phía người nhận hỗ trợ sẽ chỉ thấy người hỗ trợ là "admin" chứ không có thêm bất kỳ thông tin nào khác.

## 2. Placement and navigation

6. Where should each interface live?
   - Customer ticket creation/list: My Bookings, My Account, a Help Center, or another location?
   - Vendor hotel bookings: a new dashboard page, within hotel management/detail, or another location?
   - Vendor ticket list: dashboard, hotel detail, or another location?
   - Admin ticket queue: a new dashboard sidebar item or another location?
   - **Answer:** Đối với các ticket thuộc nhóm "khách hàng và thanh toán" việc tạo ticket sẽ cần truy cập vào trang profile, trong mục "danh mục hồ sơ" hiển thị một lựa chọn là "Ticket và Hỗ Trợ" sẽ mở một cửa xổ hiển thị trang ticket với nút tạo ticket là "Tạo Ticket hỗ trợ" với lựa chọn SUPPORT_CAT, title, ảnh hỗ trợ (không quá 2mb) biểu thị vấn đề và description của vấn đề đó.
       + Sau khi tạo Ticket sẽ được lưu vào trong list với trạng thái ticket
       + Customer có thể tìm lại ticket trong đó thông qua lọc theo SUPPORT_CAT hoặc nhập title trên thanh tìm kiếm.
       + Ticket sẽ đưa vào một không gian chat, có thể chat với chatbox AI một lúc trước khi một Admin nhận thụ lý hỗ trợ.
   - Với các ticket thuộc nhóm "Vendor và khách sạn" việc tạo ticket sẽ tạo thông qua Dashboard ở danh mục "Hỗ trợ" -> "Ticket" sẽ hiển thị thông tin tạo ticket tương tự nhưng là dành cho nhóm "Vendor và khách sạn". Việc này sẽ phân cấp rõ đâu là hỗ trợ dành cho 2 nhóm ticket.
   - Với Admin, trên Dashboard sẽ hiển thị ở danh mục "Hỗ trợ" -> "Ticket":
       + Admin không thể tạo ticket, nhưng có thể hiển thị mục tạo SUPPORT_CAT mới và cho 2 nhóm.
       + List Ticket của Admin có 2 mục: ticket thuộc bản thân đang thụ lý (các ticket này sẽ không hiển thị với các Admin khác) và ticket hiện đang chờ phản hồi hỗ trợ (Tất cả các ticket trong list này hiển thị với tất cả các Admin cho đến khi chúng được môt admin chọn thụ lý)
       + Sau khi đã vào một tiket để thụ lý, Admin sẽ có thể bắt đầu vào một giao diện chat với người tạo ticket để thực hiện hỗ trợ.

7. Should the existing My Bookings “Chat với CSKH” action open a new ticket, open the ticket list, continue opening AI chat, or offer both support options?
   - **Answer:** Việc chat với chatbox nếu nhận thấy cần tạo một Ticket hỗ trợ (trừ khi đang trong chính giao diện chat ticket) sẽ mở một modal tạo ticket chỉ với nhóm "khách hàng và thanh toán" để tạo một ticket và nếu người dùng thực sự tạo ticket sẽ đưa ngươi dùng đến trang profile mục Ticket và Hỗ Trợ và đang trong ticket đó.

8. Should the ticket list and conversation open as full pages, a drawer/modal, or another layout? Should the conversation support mobile layouts?
   - **Answer:** không cần hỗ trợ mobile, giao diện hỗ trợ như đã được bàn trước đó sẽ được hiển thị trong Dashboard và trong My Profile với từng nhóm SUPPORT_CAT, modal tạo ticket chỉ hiển thị khi tạo một ticket mới hoặc khi đang chat với chatbox và nhận thấy cần tạo ticket.

## 3. Hotel bookings list

9. Which bookings should appear in the hotel/vendor list (all statuses, date range, active hotels only, or another rule)?
   - **Answer:** Bookings with a "paid" status should be included in the list for the hotel associated with a specific vendor. (Only that vendor should be able to view these bookings, as they pertain to hotels under their management. This must be validated on both the frontend and backend to prevent unauthorized modifications via the API or similar access methods.) This includes bookings that have been subsequently cancelled. However, bookings that were cancelled due to non-payment should not be displayed, in order to avoid loading unnecessary data.

10. Which booking fields should vendors and admins be allowed to see? For example: booking code, guest/contact details, dates, room types/count, amount/payment/refund status, booking status, and creation time. Are any fields sensitive and therefore hidden or masked?
    - **Answer:** The information to be displayed includes:
       + Guest information: name, phone number, and email.
       + Booking details: booking code.
       + Hotel booking information: hotel name, specific room(s) booked, room type, number of guests, and any special requests made by the guest (e.g., presence of elderly guests or infants, smoking/non-smoking preferences, allergies such as sensitivity to fragrances, etc.). 
    - No fields require masking, as access is strictly controlled through validation to prevent unauthorized viewing.

11. Which filters, search fields, sort order, pagination, and date-range defaults are required?
    - **Answer:** Filters are necessary to support management tasks. The following filters for individual bookings are required:
       + Date-Time: Filter by check-in and check-out dates.
       + Done/In-Use: Filter by bookings currently in progress (i.e., the guest is occupying the room) or completed bookings (i.e., the check-out date has passed).
       + Cancelled: Filter by cancelled bookings (specifically, only those that were previously paid for but subsequently cancelled for some reason—not every cancelled booking should appear here). 

12. Is this list read-only, or should it also support booking actions (such as viewing details, changing dates, cancellation, or exporting)?
    - **Answer:** This feature should support the following actions for vendors:
       + Cancel a booking and notify the guest, providing a reason for the cancellation. This action can only be performed up to one month prior to the scheduled check-in date. 
       + Changing the assigned room for a guest when necessary, with the option to provide a reason to the guest. 
       + Adjusting check-in and check-out dates for a guest. This is only permitted if the check-in date is at least one month away from the current date—to prevent last-minute changes that would cause significant frustration for the guest—and the vendor must provide a reason for the date change.

## 4. Ticket creation and categories

13. Which roles may associate a ticket with a booking, a hotel, both, or neither? Must the selected booking/hotel belong to the requester or vendor?
    - **Answer:** Tùy vào SUPPORT_CAT mà người dùng có thể liên kết ticket với một đơn book, khách sạn, với SUPPORT_CAT thuộc nhóm Vendor và Khách Sạn thì những thông tin khách sạn liên kết chỉ có thể là các khách sạn thuộc quyền quản lý của họ.

14. Which ticket fields are required at creation? The schema has `ticket_type_cd`, `title`, `description`, optional booking/hotel links, priority, and initial attachments. Should users select priority, or should it default to `MEDIUM` and be admin-controlled?
    - **Answer:** Các trường thông tin về ticket_type_cd, title, description và cần thiết và bắt buộc mới có thể tạo ticket, mức độ mặc địn của ticket là MEDIUM và mức URGENT chỉ có thể được chọn cho các SUPPORT_CAT thuộc nhóm Vendor và khách sạn.

15. What ticket categories should be offered to customers and vendors? The provided module notes suggest `PWC`, `PWA`, `PTO`, `RFD`, `BKI`, `VBU`, `VIU`, `VPO`, and `GEN`. Please confirm, revise, or provide the final labels and which roles may use each.
    - **Answer:**Đã được cập nhật ghi chú trong Avora_main_schemas.sql

16. Please confirm the canonical status codes and display labels. The notes suggest `OPN`, `INP`, `WAT`, `RSV`, and `CLS`, while the schema comments also mention full names such as `OPEN` and `CLOSED`. Which values will actually be stored in `ticket_status_cd`?
    - **Answer:** Đã được cập nhật ghi chú trong Avora_main_schemas.sql

17. Have the support status/category/priority values been inserted into the deployed `m_system_code` table? Should the implementation use those database codes, or fixed application values? Please provide the final `business_cd`, `code_cd`, `code_name`, and labels where they differ from the notes.
    - **Answer:** các trạng thái m_system_code đã được cập nhật vào database, các thông tin về business_cd, code_cd và code_name được lưu trong m_system_code.md trong AVORA/avora_support_context_by_HungNQ/m_system_code.md

18. What are the validation limits for title and description (minimum/maximum length, allowed characters, trimming, and whether HTML/links are permitted)?
    - **Answer:** title giới hạn trong 50 từ, description giới hạn trong 500 chữ, và không được phép chèn link.

## 5. Attachments

19. Which file types are allowed for ticket creation and chat replies (images, PDF, documents, other)?
    - **Answer:** Tệp đính kèm chỉ có thể là hình ảnh tương tự như việc upload hình ảnh của Avatar và Hotel nhưng bỏ gif tất nhiên bao gồm cả việc giới hạn 2mb.

20. What are the maximum file size per attachment, number of attachments per ticket/message, and aggregate upload size?
    - **Answer:** Dung lượng cho mỗi tệp đính kèm trên mỗi ticket là 6mb, nhưng dung lượng tối đa cho mỗi lần tải lên là 2mb, mỗi tin nhắn cũng giới hạn trong 500 chữ nếu tin nhắn vượt 500 chữ lượng vượt dư ra sẽ tạo thêm một đoạn chat mới cùng lúc tương tự Messenger của Meta.

21. Should attachments be uploaded to a new Supabase Storage bucket? Are files public or private (signed/authorized access)? Who may view or download them, and how long should they be retained?
    - **Answer:** có bucket dùng để lưu trữ ảnh tải lên và đường dẫn URL tương tự Avata và Hotel Image dành cho cho chức năng này có tên là support_ticket_attachments, xét về tình hình hiện tại bucket này được đặt ở trạng thái public. Thời gian lưu trữ tệp ảnh của attachments là không giới hạn, nhưng nếu người người dùng đang ở lượng giới hạn 6mb, người dùng có thể xóa ảnh attachments cũ để tải lên attachment mới.

22. Are sensitive documents (for example, IDs, bank details, or payment evidence) allowed? If so, are masking, access auditing, file scanning, or special retention/removal requirements needed?
    - **Answer:** attachments được giới hạn chỉ nằm trong giới hạn là file hình ảnh tương tự avata và hotel image nhưng bỏ gif, tuy nhiên để tránh việc file gây ảnh hưởng đến hệ thống hay Admin vì admin cũng sẽ xem ảnh đấy, cần validate các trường hợp người dùng cố tình tạo một file nào đó không phải file ảnh rồi đổi đuôi vượt mặt hệ thống tải lên, hãy đảm bảo chắc chắn đó là hình ảnh rồi mới cho phép người dùng tải lên. Tất nhiên, các URL của ảnh cũng cần phải được đảm bảo rằng chỉ có Admin thụ lý Ticket và người tạo ticket đó mới có thể truy cập được ảnh.

23. Should users be able to remove or replace attachments after submitting a ticket or reply?
    - **Answer:** Có, như đã nói người dùng có thể xóa một hoặc nhiều attachments để tải lên attachment mới để nếu giới hạn 6mb đạt tới, tuy nhiên sau khi Admin xác nhận đóng ticket để được xem là ticket đã được giải quyết, các attachment sẽ không còn được phép chỉnh sửa thêm để đảm bảo tính minh bạch về sau khi cần xác thực. Kiểm tra Avora_main_schemas.sql để hiểu sự khác biệt giữa đóng ticket sau khi thụ lý xong so với việc xóa ticket.

## 6. Ticket lists, details, and conversation

24. Which filters and sort options are needed for customer/vendor ticket lists? Should pagination, search, unread indicators, or date filters be included?
    - **Answer:** Như đã bàn trước đó, bộ lọc các ticket đơn giản ở cả hai nhóm "khách hàng và thanh toán", "Vendor và khách sạn" như là lọc ticket theo title, lọc theo SUPPORT_CAT, lọc theo ngày tạo ticket. Dù giao diện thực hiện khác nhau giữa 2 nhóm (một ở trang profile, một ở dashboard) nhưng các chức năng lọc tương tự nhau. Đối với Admin, với các ticket thuộc bản thân đang thụ lý và chưa thụ lý cũng sẽ lọc theo quy tắc tương tự.

25. For the admin queue, does “closed/open” mean exactly two groups, or should admins also filter `IN_PROGRESS`, `WAITING_USER_REPLY`, and `RESOLVED` separately? Should admins be able to filter by category, priority, requester, hotel, booking, assignee, and date?
    - **Answer:** đối với Admin, trạng thái của ticket chỉ bảo gồm Open cho các ticket chưa có admin nào thụ lý, IN_PROGRESS cho các ticket bản thân đang thụ lý và RESOLVED cho các ticket đã thụ lý xong và đã đóng (lúc này sẽ không còn có thể chat được nữa nhưng vẫn có khả năng truy cập để xem các chat trong quá trình được hỗ trợ và hỗ trợ giữa hai đối tượng), các ticket với trạng thái is_deleted = true thì mặc định sẽ không thể truy cập được mặc dù vẫn sẽ hiển thị thẻ ticket đó ở trạng thái đã xóa. Nói đến, các ticket để có thể bị xóa chỉ có 2 trường hợp:
       + người tạo ticket tự động xóa ticket.
       + Admin thụ lý xóa ticket.
    - Trạng thái ticket bị xóa sẽ hiển thị ở phía Admin và người tạo ticket nhưng không còn có thể truy cập được nữa, chỉ là một thẻ ticket ở trạng thái bị xóa.

26. Which data should a ticket detail show (requester identity/contact, linked hotel/booking, category, priority, status, assignee, creation/update timestamps, attachments, and resolution note)?
    - **Answer:** Trừ việc từ phía người dùng nhóm "khách hàng và thanh toán" không hiển thị cho biết Admin đang thụ lý là ai mà chỉ hiển thị "Admin", phía nhóm Vendor và khách sạn vẫn sẽ hiển thị thông tin của Admin đang thụ lý hỗ trợ ticket này là ai. Phía Admin thì vẫn sẽ cho biết tài khoản tạo ticket mình đang thụ lý là ai và có thể truy vấn sang (nếu admin có chức năng quản lý tài khoản, khi nhấn vào biểu tượng avata của đối tượng tạo ticket sẽ có lựa chọn "xem thông tin tài khoản" và nếu admin nhấn vào sẽ đưa admin đến trang quản lý tài khoản của tài khoản đó).
    - Ngoài ra ticket sẽ hiển thị thông tin như bình thường trong danh sách ticket và trang chat ticket đó.

27. Which participants may send public replies? Should both the ticket requester and assigned/unassigned admins be allowed to respond? May vendors respond to tickets created by a customer, or only to their own tickets?
    - **Answer:** Các ticket được tạo chỉ có thể được chat giữa người tạo ticket và Admin thụ lý, một khi ticket đã có admin thụ lý cho nó không có bất kỳ tài khoản admin nào khác có thể truy cập thụ lý cho ticket này. Tin nhắn giữa người tạo ticket và Admin thụ lý chỉ có thể truy cập giữa hai người này.

28. Should admins be able to add internal notes using `is_internal_note`? Who can see internal notes, and should internal notes be visually distinct from public messages?
    - **Answer:** Được rồi, đọc đến đây tôi mới để ý thông tin về việc các Admin note tin nhắn nội bộ cho nhau, vậy cần thay đổi việc chỉ có Admin thụ lý mới được quyền truy cập mà các Admin khác cũng có thể tham gia hỗ trợ, tuy nhiên việc này cũng cho thấy Admin thụ lý vẫn có vai trò quan trọng và chịu trách nhiệm cho ticket bản thân thụ lý, vậy nên việc lọc các ticket sẽ có thêm mục lọc theo các ticket đang thụ lý của admin đó, tuy vậy việc phía nhóm "khách hàng và thanh toán" chỉ hiển thị admin là "Admin" và nhóm "Vendor và khách sạn" hiển thị tên các Admin đang hỗ trợ ticket của họ vẫn sẽ được áp dụng bình thường.
    - Quay lại vấn đề chính, các tin nhắn với is_internal_note = true sẽ chỉ hiển thị đối với các Admin và sẽ được tạo nổi bậc để dễ dàng chú ý đâu là tin nhắn is_internal_note. Về việc áp dụng sao để một tin nhắn là is_internal_note, khi các admin chat sẽ có một dấu tích kế bên để biểu hiện tin nhắn đang soạn đó sẽ là tin internal note hay không, nếu muốn nó là internal note, trước khi gửi tin hãy tích vào đó trước.

29. What are the message validation limits (required/optional message when attachments exist, maximum message length, allowed formatting/links, attachment rules)?
    - **Answer:** như đã bàn trước đó.

30. Is real-time chat required (for example, Supabase Realtime/WebSockets), or is refresh/polling acceptable? Should messages show read/delivery state, sender role/name/avatar, and timestamps?
    - **Answer:** có áp dụng thời gian thực, và hiển thị thời gian tin nhắn được gửi. các thông tin còn lại hiển thị như đã bàn trước đó.

## 7. Status workflow and ticket lifecycle

31. Which roles can change ticket status, and which transitions are valid? Please specify the workflow, including who can reopen a resolved/closed ticket.
    - **Answer:** Về việc thay đổi trạng thái ticket, phía người tạo ticket có quyền xóa ticket (chuyển is_deleted = true), trong khi đó trạng thái ticket bao gồm:
       + OPEN: khi chưa có Admin thụ lý
       + IN_PROGRESS: Khi đã có Admin thụ lý
       + WAITING_USER_REPLY: diễn ra tương đồng và song song với IN_PROGRESS nhưng trạng thái này chỉ có khi Admin đã nhắn một tin nhắn (không phải internal note) và đang chờ người dùng phản hồi.
       + RESOLVED: khi ticket đã được giải quyết và người tạo ticket đồng ý RESOLVED (trạng thái diễn ra khi Admin thông báo ticket RESOLVED với resolution_note và người tạo ticket đồng ý ticket đã RESOLVED) chỉ khi RESOLVED Admin mới có thể xác nhận đóng ticket.
       + CLOSED: Trạng thái sau cùng sau khi đã giải quyết xong ticket, admin có thể đóng ticket này (lúc này sẽ không còn có thể chat được nữa, tuy nhiên giữa người tạo ticket và Admin vẫn có thể truy vấn để xem lại quá trình hỗ trợ và được hộ trợ)
    - Ticket trong trạng thái OPEN, người tạo ticket có thể chat với chatbox AI (đã được cấu hình và thiết lập) cho đến khi trạng thái chuyển sang IN_PROGRESS.

32. Should posting a requester reply automatically set the status to `OPEN` or `WAITING_USER_REPLY`? Should an admin reply automatically set it to `IN_PROGRESS` or another status?
    - **Answer:** như đã bàn trước đó.

33. What is the distinction between `RESOLVED` and `CLOSED`? Does a ticket close automatically after a time period, or only by an explicit action?
    - **Answer:** như đã bàn trước đó, sự khác biệt giữa RESOLVED và CLOSED:
       + RESOLVED: khi Admin đã giải quyết xong ticket và người tạo ticket chuyển ticket sang trạng thái này, giữa người tạo ticket và Admin vẫn có thể chat được (nhưng đại ý, vấn đề đã được giải quyết).
       + CLOSED: Đóng ticket và giữa người tạo ticket và Admin không còn có thể thực hiện chat được nữa, nhưng vẫn có thể truy cập truy vấn lại quá trình giải quyết ticket.

34. Is `resolution_note` required when resolving/closing? Who may set or edit it, and should the requester see it?
    - **Answer:** resolution_note là cần thiết khi Admin thông báo ticket đã RESOLVED cho người tạo ticket. Người có thể chỉnh sửa nội dung resolution_note là Admin thụ lý ticket đó.

35. Should tickets/replies ever be deleted? The ticket schema includes `is_deleted`; if deletion is allowed, who may do it, should it be soft-delete only, and should audit history be retained?
    - **Answer:** Khi ticket bị xóa, nó sẽ là xóa mềm và thông tin vẫn sẽ được lưu trong database, chỉ có người tạo ticket và admin thụ lý ticket đó mới có quyền xóa ticket đó, và tất nhiên là cần lưu lại lịch sử audit với thông tin ticket bị xóa, ai xóa, xóa vào lúc nào.

## 8. Notifications, performance, and quality

36. Which events should notify users/admins (ticket created, assigned, reply received, status changed, resolved/closed)? Which channels are needed: in-app, email, or both?
    - **Answer:** Với thông báo, khi người dùng nhận được các cập nhật về ticket của mình:
       + Đối với người tạo ticket thuộc nhóm "khách hàng và thanh toán" hình avata trên thanh header sẽ có một dấu chấm đỏ, sau khi truy cập vào profile mục "ticket và hỗ trợ" cũng sẽ có chấm đỏ này, trong danh sách các ticket, ticket vừa nhận được các trạng thái: nhận phản hồi của admin mà bản thân chưa phản hồi, admin yêu cầu xác nhận ticket RESOLVED sẽ có dấu chấm đỏ cho đến khi phản hồi lại admin hoặc xác nhận RESOLVED ticket.
       + Đối với người tạo ticket thuộc nhóm "Vendor và khách sạn" mục truy cập Dashboard có dấu chấm đỏ, truy cập dashboard mục ticket sẽ có dấu chấm đỏ, trong danh sách các ticket, ticket vừa nhận được các trạng thái: nhận phản hồi của admin mà bản thân chưa phản hồi, admin yêu cầu xác nhận ticket RESOLVED sẽ có dấu chấm đỏ cho đến khi phản hồi lại admin hoặc xác nhận RESOLVED ticket.
       + Đối với Admin, nhận được phản hồi của người tạo ticket và người tạo ticket xác nhận RESOLVED ticket mà bản thân chưa phản hồi cũng sẽ có các dấu chấm đỏ này trong mục của mình.

37. Should admins be notified for every new ticket or only assigned tickets? Should requesters/vendors receive notifications for internal notes (normally no)?
    - **Answer:** Admin chỉ nhận thông báo của ticket thuộc bản thân thụ lý, người tạo ticket sẽ không nhận được thông báo đối với các tin nhắn is_internal_note = true.

38. What are the expected ticket volume and booking-list volume? This will help determine page size, filtering strategy, and whether admin queue counts or unread counts are required.
    - **Answer:** có

39. Are there existing acceptance criteria, test accounts, or demo workflows for customer, vendor, and admin roles that should be used to verify this feature?
    - **Answer:** chưa có, hãy tự tạo các acceptance criteria dựa trên những gì đã bàn ở trên. Các tài khoản dùng để kiểm tra chức năng sẽ được cung cấp.

40. Is there any operational requirement for logging/auditing ticket assignments, replies, status changes, attachment access, and resolution decisions?
    - **Answer:** không.

## Optional notes

- **Additional requirements / edge cases:**
- **Decisions that can use the project defaults:**
- Accounts for functional testing—used to review and execute features, identify errors, and remove unnecessary code:
   + Customer: email '', password ''
   + Vendor: email 'vendor.nhatrang@avora.vn', password '12345678'
   + Business Management: email 'yaminohana35@gmail.com', password '0123456789'
   + System Admin: email '', password ''