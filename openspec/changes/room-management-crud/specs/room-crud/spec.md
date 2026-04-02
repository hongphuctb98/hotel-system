## ADDED Requirements

### Requirement: List rooms with pagination and filters
The system SHALL display all active rooms in a paginated table. The table SHALL support filtering by Floor, RoomType, and RoomStatus via dropdown selects. The table SHALL include a "Show inactive rooms" toggle that, when enabled, includes inactive rooms in the results. Pagination SHALL use the standard `page` and `limit` query parameters.

#### Scenario: Default room list loads
- **WHEN** a user navigates to the rooms page
- **THEN** the system displays the first page of active rooms ordered by room number ascending

#### Scenario: Filter by floor
- **WHEN** a user selects a floor from the filter dropdown
- **THEN** the table updates to show only rooms on that floor

#### Scenario: Filter by room type
- **WHEN** a user selects a room type from the filter dropdown
- **THEN** the table updates to show only rooms of that type

#### Scenario: Filter by room status
- **WHEN** a user selects a room status from the filter dropdown
- **THEN** the table updates to show only rooms with that status

#### Scenario: Show inactive rooms toggle enabled
- **WHEN** a user enables the "Show inactive rooms" toggle
- **THEN** the table includes both active and inactive rooms, with inactive rooms visually distinguished (e.g., dimmed row or badge)

#### Scenario: Show inactive rooms toggle disabled
- **WHEN** the "Show inactive rooms" toggle is disabled (default)
- **THEN** the table displays only active rooms

#### Scenario: Empty state
- **WHEN** no rooms match the current filters
- **THEN** the table displays an empty state message

### Requirement: Create a new room
The system SHALL allow authorized users to create a room by providing: room number (required), floor (required), room type (required), room status (required), base price (optional, numeric), amenities (optional, multi-select), note (optional), and images (optional, multiple files). The system SHALL prevent duplicate room numbers.

#### Scenario: Successful room creation
- **WHEN** a user submits a valid create room form
- **THEN** the system creates the room with all provided amenities and refreshes the room list

#### Scenario: Successful room creation with images
- **WHEN** a user attaches one or more images in the create form and submits
- **THEN** the system creates the room, uploads the images after save, and displays them in subsequent edit sessions

#### Scenario: Duplicate room number
- **WHEN** a user submits a room number that already exists
- **THEN** the system displays a validation error and does not create the room

#### Scenario: Missing required fields
- **WHEN** a user submits the create form without all required fields
- **THEN** the system displays inline validation errors and does not submit

### Requirement: Edit an existing room
The system SHALL allow authorized users to edit a room's floor, room type, room status, base price, amenities, note, and images. Room number SHALL be editable only if no active bookings reference the room. The edit form SHALL pre-populate with the current room values including existing images.

#### Scenario: Open edit drawer
- **WHEN** a user clicks the edit action on a room row
- **THEN** the system opens a drawer pre-filled with the room's current values including selected amenities and existing images

#### Scenario: Successful room update
- **WHEN** a user modifies fields and submits the edit form
- **THEN** the system persists the changes (including amenity replacements) and refreshes the room list

#### Scenario: Amenities cleared on update
- **WHEN** a user removes all amenities and submits the edit form
- **THEN** the system removes all RoomAmenity records for that room

#### Scenario: Add image in edit
- **WHEN** a user uploads a new image in the edit drawer
- **THEN** the system calls the image upload endpoint and adds a RoomImage record

#### Scenario: Remove existing image in edit
- **WHEN** a user removes an existing image in the edit drawer
- **THEN** the system immediately calls the image delete endpoint and removes the file and RoomImage record

### Requirement: Deactivate a room
The system SHALL allow authorized users to deactivate a room (soft delete). Deactivated rooms SHALL no longer appear in the room list or room-map views. The system SHALL prompt for confirmation before deactivating.

#### Scenario: Confirmation before deactivate
- **WHEN** a user clicks the delete/deactivate action on a room
- **THEN** the system displays a confirmation dialog explaining the room will be deactivated

#### Scenario: Successful deactivation
- **WHEN** a user confirms deactivation
- **THEN** the system sets `isActive = false` on the room and removes it from the list view

#### Scenario: Cancel deactivation
- **WHEN** a user dismisses the confirmation dialog
- **THEN** no changes are made to the room

### Requirement: Create Room button in table header
The rooms table toolbar SHALL include a primary "Create Room" button with a plus icon, positioned at the top-right of the filter bar. Clicking it SHALL open the Room Drawer in create mode (empty form). The button SHALL be visible only to users with the `rooms:manage` permission; users with only `rooms:view` SHALL NOT see it. The button SHALL be self-contained within `RoomTable` — no separate page-level create entry point is required.

#### Scenario: Create Room button visible to manager
- **WHEN** a user with `rooms:manage` permission views the rooms page
- **THEN** a primary "Create Room" button appears at the top-right of the filter bar

#### Scenario: Create Room button hidden from read-only user
- **WHEN** a user with only `rooms:view` permission views the rooms page
- **THEN** the "Create Room" button is not rendered

#### Scenario: Button opens drawer in create mode
- **WHEN** a user clicks the "Create Room" button
- **THEN** the Room Drawer opens with an empty form (no pre-filled values)

### Requirement: Room form includes amenity multi-select
The create and edit room forms SHALL include a multi-select field populated from the Amenity master data. The amenity list SHALL be fetched once with `staleTime: Infinity` via the `useMasterData()` hook.

#### Scenario: Amenities load in form
- **WHEN** a user opens the create or edit room drawer
- **THEN** the amenity multi-select is populated with all available amenities from master data

#### Scenario: Pre-selected amenities in edit
- **WHEN** a user opens the edit drawer for a room that has amenities
- **THEN** the amenity multi-select shows those amenities as pre-selected

### Requirement: Permission-based access control
The rooms page and its actions SHALL be protected by role-based permissions. The system SHALL expose two permission levels: `rooms:view` (read-only) and `rooms:manage` (create, edit, deactivate). ADMIN and MANAGER roles SHALL have `rooms:manage`. RECEPTIONIST SHALL have `rooms:view`. HOUSEKEEPING SHALL have no access to the rooms management page.

#### Scenario: Receptionist sees read-only view
- **WHEN** a RECEPTIONIST user navigates to the rooms page
- **THEN** the create button and edit/delete actions are hidden

#### Scenario: Unauthorized access redirect
- **WHEN** a HOUSEKEEPING user navigates to the rooms page
- **THEN** the system denies access (no navigation entry shown)

### Requirement: Rooms navigation entry
The system SHALL include a "Rooms" entry in the main sidebar navigation, visible to users with the `rooms:view` permission. The entry SHALL appear after "Room Map" in the navigation order.

#### Scenario: Rooms link in sidebar
- **WHEN** a user with `rooms:view` permission loads the application
- **THEN** the sidebar shows a "Rooms" navigation item linking to the rooms page

### Requirement: Display effective price with fallback to room type default
The rooms table price column SHALL display `room.basePrice` when it is set. When `room.basePrice` is null, the column SHALL fall back to and display `room.roomType.defaultPrice`. The displayed value SHALL be formatted as a currency using the project's locale-aware currency formatter.

#### Scenario: Room has its own base price
- **WHEN** a room has a non-null `basePrice`
- **THEN** the price column shows the room's own base price formatted as currency

#### Scenario: Room has no base price
- **WHEN** a room's `basePrice` is null
- **THEN** the price column shows the room type's `defaultPrice` formatted as currency

### Requirement: Room image management
The system SHALL support uploading, displaying, and deleting multiple images per room. Images SHALL be stored on the local filesystem and referenced via the `RoomImage` model. The API SHALL expose dedicated endpoints for image upload and deletion that operate independently from the room save transaction.

#### Scenario: Upload image via API
- **WHEN** a `POST /api/rooms/[id]/images` request is received with a valid image file
- **THEN** the system saves the file to `public/uploads/rooms/[roomId]/` and creates a `RoomImage` record with the relative URL

#### Scenario: Delete image via API
- **WHEN** a `DELETE /api/rooms/[id]/images/[imageId]` request is received
- **THEN** the system deletes the `RoomImage` record and removes the corresponding file from disk

#### Scenario: Images included in room API response
- **WHEN** `GET /api/rooms` or `GET /api/rooms/[id]` is called
- **THEN** the response includes the `images` array on each room (each item: `id`, `url`, `order`)

#### Scenario: Image upload component in drawer
- **WHEN** a user opens the create or edit room drawer
- **THEN** an Ant Design Upload component (`listType="picture-card"`) is shown; existing images are pre-loaded; new uploads call the image endpoint after room save; removing an image calls the delete endpoint immediately
