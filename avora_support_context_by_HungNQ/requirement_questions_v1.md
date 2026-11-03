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
   - **Answer:** A ticket is a support request form created by users to communicate with Admins for handling specific cases (refer to `Avora_main_schemas.sql` for more details):
   - **Customer and Payment Group:**
       + ('SUPPORT_CAT', '1', 'PWC', 1), -- PWC: Pay Wrong Code
       + ('SUPPORT_CAT', '2', 'PWA', 2), -- PWA: Pay Wrong Amount
       + ('SUPPORT_CAT', '3', 'PTO', 3), -- PTO: Pay Timeout
       + ('SUPPORT_CAT', '4', 'RFD', 4), -- RFD: Refund
       + ('SUPPORT_CAT', '5', 'BKI', 5), -- BKI: Booking Issue
   - **Vendor and Hotel Group:**
       + ('SUPPORT_CAT', '6', 'VBU', 6), -- VBU: Vendor Bank Update
       + ('SUPPORT_CAT', '7', 'VIU', 7), -- VIU: Vendor Info Update
       + ('SUPPORT_CAT', '8', 'VPO', 8), -- VPO: Vendor Policy
   - Accordingly, related operations will be directly discussed with Admins (System Admins) for support or via AI chat while waiting for an Admin's response.
    
2. Which roles may view ticket lists and details?
   - Customer: own tickets only?
   - Vendor: own tickets only, tickets connected to their hotels, or both?
   - System admin (`ADM`): all tickets?
   - Business manager (`BMR`): no access, read-only access, or ticket handling access?
   - **Answer:** Tickets are owned exclusively by their creators and cannot be accessed by other accounts, except for Admins who respond to and support these tickets.
       + Accordingly, tickets owned by Customers cannot have a `SUPPORT_CAT` belonging to the Vendor and Hotel group. However, Vendors can still own `SUPPORT_CAT`s from the Customer and Payment group because Vendors are also entitled to act as customers; this must be strictly validated on both the Frontend and Backend.
       + Business Managers do not participate in this feature, except for having the right to use `SUPPORT_CAT`s from the Customer and Payment group.

3. May a vendor view bookings only for hotels they own? Should system admins also be able to view hotel bookings? Should customers see their own booking list here, or should the existing My Bookings page remain the only customer booking list?
   - **Answer:** Vendors can only view bookings belonging to hotels they manage. Customers do not have access to the dashboard, so the Customer's My Bookings list will remain on the project's current My Bookings page. Hotel management rests entirely with Vendors, so System Admins will only be able to view and approve deletion/activation without exercising hotel editing privileges like Vendors.

4. For a ticket linked to a booking or hotel, should access be restricted to the booking owner / hotel owner, in addition to the ticket requester and admins?
   - **Answer:** No, ticket access is restricted strictly between the System Admin and the ticket creator and cannot be accessed in any other way.

5. Should admins be able to assign tickets to themselves or another admin? Is assignment required before responding or changing status?
   - **Answer:** Tickets can be responded to by any admin at that time. Once an admin accepts to handle the support, they become the assigned agent responsible for this assistance (once the assigned Admin is confirmed, ticket access will be locked exclusively between the ticket creator and that admin, validated on both frontend and backend). However, the support recipient will only see the handler displayed as "admin" with no additional information.

## 2. Placement and navigation

6. Where should each interface live?
   - Customer ticket creation/list: My Bookings, My Account, a Help Center, or another location?
   - Vendor hotel bookings: a new dashboard page, within hotel management/detail, or another location?
   - Vendor ticket list: dashboard, hotel detail, or another location?
   - Admin ticket queue: a new dashboard sidebar item or another location?
   - **Answer:** For tickets belonging to the "Customer and Payment" group, ticket creation requires accessing the profile page, where the "Profile Menu" displays an option "Tickets & Support". This opens a window showing the ticket page with a "Create Support Ticket" button containing choices for `SUPPORT_CAT`, title, support image (maximum 2MB) illustrating the issue, and description of the problem.
       + Once created, the ticket is saved in the list with its ticket status.
       + Customers can search for their tickets by filtering by `SUPPORT_CAT` or entering a title in the search bar.
       + The ticket enters a chat space where users can chat with the AI chatbot for a while before an Admin takes over the support.
   - For tickets belonging to the "Vendor and Hotel" group, ticket creation is done via the Dashboard under the "Support" -> "Ticket" menu, displaying a similar ticket creation interface tailored for the "Vendor and Hotel" group. This clearly categorizes support for the two distinct ticket groups.
   - For Admins, the Dashboard displays under the "Support" -> "Ticket" menu:
       + Admins cannot create tickets, but can view the section to create new `SUPPORT_CAT`s for both groups.
       + The Admin Ticket List has two sections: tickets currently handled by oneself (these are not visible to other admins) and tickets currently waiting for support response (all tickets in this list are visible to all admins until picked up by an admin).
       + Once entering a ticket to handle it, the Admin can access a chat interface with the ticket creator to provide assistance.

7. Should the existing My Bookings “Chat với CSKH” action open a new ticket, open the ticket list, continue opening AI chat, or offer both support options?
   - **Answer:** Chatting with the chatbot, if it is determined that a support ticket needs to be created (unless already in the ticket chat interface itself), will open a ticket creation modal limited to the "Customer and Payment" group to create a ticket. If the user actually creates the ticket, they will be redirected to the profile page under the "Tickets & Support" section directly into that ticket.

8. Should the ticket list and conversation open as full pages, a drawer/modal, or another layout? Should the conversation support mobile layouts?
   - **Answer:** Mobile support is not required. The support interface, as discussed previously, will be displayed in the Dashboard and My Profile mapped to each `SUPPORT_CAT` group. The ticket creation modal will only appear when creating a new ticket or when chatting with the chatbot and identifying the need to create a ticket.

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
    - **Answer:** Depending on the `SUPPORT_CAT`, users can link a ticket to a booking or a hotel. For `SUPPORT_CAT`s belonging to the Vendor and Hotel group, the linked hotel information can only be hotels under their management.

14. Which ticket fields are required at creation? The schema has `ticket_type_cd`, `title`, `description`, optional booking/hotel links, priority, and initial attachments. Should users select priority, or should it default to `MEDIUM` and be admin-controlled?
    - **Answer:** The fields `ticket_type_cd`, `title`, and `description` are necessary and mandatory to create a ticket. The default priority of the ticket is `MEDIUM`, and the `URGENT` level can only be selected for `SUPPORT_CAT`s belonging to the Vendor and Hotel group.

15. What ticket categories should be offered to customers and vendors? The provided module notes suggest `PWC`, `PWA`, `PTO`, `RFD`, `BKI`, `VBU`, `VIU`, `VPO`, and `GEN`. Please confirm, revise, or provide the final labels and which roles may use each.
    - **Answer:** Updated in the notes within `Avora_main_schemas.sql`.

16. Please confirm the canonical status codes and display labels. The notes suggest `OPN`, `INP`, `WAT`, `RSV`, and `CLS`, while the schema comments also mention full names such as `OPEN` and `CLOSED`. Which values will actually be stored in `ticket_status_cd`?
    - **Answer:** Updated in the notes within `Avora_main_schemas.sql`.

17. Have the support status/category/priority values been inserted into the deployed `m_system_code` table? Should the implementation use those database codes, or fixed application values? Please provide the final `business_cd`, `code_cd`, `code_name`, and labels where they differ from the notes.
    - **Answer:** The `m_system_code` statuses have been updated into the database; information regarding `business_cd`, `code_cd`, and `code_name` is stored in `m_system_code.md` located at `AVORA/avora_support_context_by_HungNQ/m_system_code.md`.

18. What are the validation limits for title and description (minimum/maximum length, allowed characters, trimming, and whether HTML/links are permitted)?
    - **Answer:** The title is limited to 50 words, the description is limited to 500 words, and inserting links is not permitted.

## 5. Attachments

19. Which file types are allowed for ticket creation and chat replies (images, PDF, documents, other)?
    - **Answer:** Attachments can only be images, similar to uploading Avatar and Hotel images but excluding GIFs, and adhering to a 2MB limit.

20. What are the maximum file size per attachment, number of attachments per ticket/message, and aggregate upload size?
    - **Answer:** The storage capacity for each attachment per ticket is 6MB, but the maximum size per single upload is 2MB. Each message is also limited to 500 words; if a message exceeds 500 words, the excess amount will create a new chat bubble simultaneously, similar to Meta's Messenger.

21. Should attachments be uploaded to a new Supabase Storage bucket? Are files public or private (signed/authorized access)? Who may view or download them, and how long should they be retained?
    - **Answer:** There is a bucket used to store uploaded images and URL paths similar to Avatar and Hotel Images dedicated to this feature, named `support_ticket_attachments`. Currently, this bucket is set to public. The retention period for attachment image files is unlimited; however, if users reach the 6MB limit, they can delete old attachment images to upload new ones.

22. Are sensitive documents (for example, IDs, bank details, or payment evidence) allowed? If so, are masking, access auditing, file scanning, or special retention/removal requirements needed?
    - **Answer:** Attachments are limited strictly to image files similar to avatars and hotel images excluding GIFs. However, to prevent files from harming the system or Admins (since admins will also view those images), validation is required to handle cases where users intentionally create a non-image file and change its extension to bypass the system upload. Ensure with absolute certainty that it is an image before allowing the user to upload. Of course, image URLs must also be secured so that only the assigned Ticket Admin and the ticket creator can access them.

23. Should users be able to remove or replace attachments after submitting a ticket or reply?
    - **Answer:** Yes, as mentioned, users can delete one or more attachments to upload new ones if the 6MB limit is reached. However, after the Admin confirms closing the ticket as resolved, attachments will no longer be editable to ensure future transparency when verification is needed. Check `Avora_main_schemas.sql` to understand the difference between closing a ticket after handling versus deleting a ticket.

## 6. Ticket lists, details, and conversation

24. Which filters and sort options are needed for customer/vendor ticket lists? Should pagination, search, unread indicators, or date filters be included?
    - **Answer:** As discussed previously, simple ticket filters for both groups ("Customer and Payment" and "Vendor and Hotel") include filtering tickets by title, `SUPPORT_CAT`, and ticket creation date. Although the UI implementation differs between the two groups (one in the profile page, one in the dashboard), the filtering functions are similar. For Admins, tickets handled by oneself and unassigned tickets will also be filtered following similar rules.

25. For the admin queue, does “closed/open” mean exactly two groups, or should admins also filter `IN_PROGRESS`, `WAITING_USER_REPLY`, and `RESOLVED` separately? Should admins be able to filter by category, priority, requester, hotel, booking, assignee, and date?
    - **Answer:** For Admins, ticket statuses consist only of `OPEN` for unassigned tickets, `IN_PROGRESS` for tickets currently handled by oneself, and `RESOLVED` for handled and closed tickets (at this point, chatting is disabled, but access remains available to view chat logs during the support process between both parties). Tickets with `is_deleted = true` cannot be accessed by default, although the ticket card will still be displayed in a deleted state. Specifically, tickets can only be deleted in two cases:
       + The ticket creator deletes the ticket themselves.
       + The assigned Admin deletes the ticket.
    - The deleted ticket status will be displayed for both the Admin and the ticket creator, but it is no longer accessible—serving merely as a ticket card in a deleted status.

26. Which data should a ticket detail show (requester identity/contact, linked hotel/booking, category, priority, status, assignee, creation/update timestamps, attachments, and resolution note)?
    - **Answer:** Except for the "Customer and Payment" user group where the assigned Admin is not displayed and only shown as "Admin", the Vendor and Hotel group will display information regarding which Admin is handling and supporting the ticket. For Admins, it will show who the ticket creator account is and allow navigation over to it (if the admin has account management functionality, clicking the creator's avatar icon will display an option "View Account Details", and clicking it will direct the admin to that account's management page).
    - Additionally, the ticket will display information as usual within the ticket list and the ticket chat page.

27. Which participants may send public replies? Should both the ticket requester and assigned/unassigned admins be allowed to respond? May vendors respond to tickets created by a customer, or only to their own tickets?
    - **Answer:** Created tickets can only be chatted between the ticket creator and the assigned Admin. Once a ticket has an assigned admin, no other admin account can access or handle this ticket. Messages between the ticket creator and the assigned Admin are accessible exclusively between these two individuals.

28. Should admins be able to add internal notes using `is_internal_note`? Who can see internal notes, and should internal notes be visually distinct from public messages?
    - **Answer:** Alright, reading this far, I noticed the information about Admins noting internal messages for one another. Therefore, we need to change the rule so that access is not restricted solely to the assigned Admin, allowing other admins to also participate in providing support. However, this also shows that the assigned Admin still plays an important role and is responsible for the ticket they handle, so ticket filtering will include an option to filter by tickets currently handled by that specific admin. Meanwhile, the rule where the "Customer and Payment" group displays the handler simply as "Admin" while the "Vendor and Hotel" group displays the names of the Admins supporting their tickets will still apply normally.
    - Returning to the main issue, messages with `is_internal_note = true` will only be visible to Admins and will be highlighted to easily distinguish internal notes. Regarding how to apply an internal note, when admins chat, there will be a checkbox next to the input indicating whether the message being composed is an internal note. If an admin wants it to be an internal note, they must check the box before sending the message.

29. What are the message validation limits (required/optional message when attachments exist, maximum message length, allowed formatting/links, attachment rules)?
    - **Answer:** As discussed previously.

30. Is real-time chat required (for example, Supabase Realtime/WebSockets), or is refresh/polling acceptable? Should messages show read/delivery state, sender role/name/avatar, and timestamps?
    - **Answer:** Real-time is applied, and the timestamp of when the message was sent is displayed. All other information is displayed as discussed previously.

## 7. Status workflow and ticket lifecycle

31. Which roles can change ticket status, and which transitions are valid? Please specify the workflow, including who can reopen a resolved/closed ticket.
    - **Answer:** Regarding ticket status changes, the ticket creator has the right to delete the ticket (setting `is_deleted = true`). Meanwhile, ticket statuses include:
       + `OPEN`: When there is no assigned Admin yet.
       + `IN_PROGRESS`: When an Admin has taken over the ticket.
       + `WAITING_USER_REPLY`: Occurs similarly and parallel to `IN_PROGRESS`, but this status only applies when the Admin has sent a message (not an internal note) and is waiting for the user's response.
       + `RESOLVED`: When the ticket has been resolved and the ticket creator agrees to `RESOLVED` (this occurs when the Admin notifies that the ticket is `RESOLVED` with a `resolution_note` and the ticket creator confirms agreement). Only when `RESOLVED` can the Admin confirm closing the ticket.
       + `CLOSED`: The final status after the ticket is fully resolved; the admin can close the ticket (at this point, chatting is disabled, but the ticket creator and Admin can still query to review the support process and assistance provided).
    - While a ticket is in the `OPEN` status, the ticket creator can chat with the configured AI chatbot until the status transitions to `IN_PROGRESS`.

32. Should posting a requester reply automatically set the status to `OPEN` or `WAITING_USER_REPLY`? Should an admin reply automatically set it to `IN_PROGRESS` or another status?
    - **Answer:** As discussed previously.

33. What is the distinction between `RESOLVED` and `CLOSED`? Does a ticket close automatically after a time period, or only by an explicit action?
    - **Answer:** As discussed previously, the difference between `RESOLVED` and `CLOSED`:
       + `RESOLVED`: When the Admin has completed solving the ticket and the ticket creator transitions the ticket to this status, the ticket creator and Admin can still chat (meaning the issue is essentially resolved).
       + `CLOSED`: The ticket is closed, and chatting between the ticket creator and Admin is disabled, but they can still access and query the ticket resolution history.

34. Is `resolution_note` required when resolving/closing? Who may set or edit it, and should the requester see it?
    - **Answer:** `resolution_note` is required when the Admin notifies the ticket creator that the ticket is `RESOLVED`. The person authorized to edit the content of the `resolution_note` is the Admin handling that ticket.

35. Should tickets/replies ever be deleted? The ticket schema includes `is_deleted`; if deletion is allowed, who may do it, should it be soft-delete only, and should audit history be retained?
    - **Answer:** When a ticket is deleted, it is a soft delete, and the information remains stored in the database. Only the ticket creator and the assigned Admin have the permission to delete that ticket, and of course, audit history must be retained with information on the deleted ticket, who deleted it, and when it was deleted.

## 8. Notifications, performance, and quality

36. Which events should notify users/admins (ticket created, assigned, reply received, status changed, resolved/closed)? Which channels are needed: in-app, email, or both?
    - **Answer:** Regarding notifications when users receive updates on their tickets:
       + For ticket creators in the "Customer and Payment" group, the avatar icon on the header bar will display a red dot. Upon accessing the profile under the "Tickets & Support" section, this red dot will also appear. In the ticket list, tickets that recently received updates (e.g., receiving an admin response that the user has not yet replied to, or an admin requesting confirmation for a `RESOLVED` ticket) will display a red dot until the user replies to the admin or confirms the `RESOLVED` ticket.
       + For ticket creators in the "Vendor and Hotel" group, the Dashboard menu item will display a red dot, and accessing the Dashboard ticket section will also show a red dot. In the ticket list, tickets with recent updates (admin replies awaiting user response, or admin requesting `RESOLVED` confirmation) will have a red dot until the user responds or confirms.
       + For Admins, receiving a response from the ticket creator or when the ticket creator confirms a `RESOLVED` ticket which the admin hasn't responded to yet will also trigger these red dots within their respective sections.

37. Should admins be notified for every new ticket or only assigned tickets? Should requesters/vendors receive notifications for internal notes (normally no)?
    - **Answer:** Admins only receive notifications for tickets assigned to and handled by themselves. Ticket creators will not receive notifications for messages where `is_internal_note = true`.

38. What are the expected ticket volume and booking-list volume? This will help determine page size, filtering strategy, and whether admin queue counts or unread counts are required.
    - **Answer:** Yes.

39. Are there existing acceptance criteria, test accounts, or demo workflows for customer, vendor, and admin roles that should be used to verify this feature?
    - **Answer:** None yet; please create acceptance criteria yourself based on what has been discussed above. Test accounts for checking functionalities will be provided.

40. Is there any operational requirement for logging/auditing ticket assignments, replies, status changes, attachment access, and resolution decisions?
    - **Answer:** No.

## Optional notes

- **Additional requirements / edge cases:** Implement lazy loading where necessary, and ensure the frontend interface is visually appealing and consistent with the color theme designed for the entire project.
- **Decisions that can use the project defaults:**
- Accounts for functional testing—used to review and execute features, identify errors, and remove unnecessary code:
   + Customer: email 'customer@gmail.com', password '12345678'
   + Vendor: email 'vendor.nhatrang@avora.vn', password '12345678'
   + Business Management: email 'yaminohana35@gmail.com', password '0123456789'
   + System Admin: email 'hungnq.ce190870@gmail.com', password '12345678'