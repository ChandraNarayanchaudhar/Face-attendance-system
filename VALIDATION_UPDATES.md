# Teacher Session Assignment & Validation Updates

## Overview

Complete validation and semester-based teacher session assignment system has been implemented across the backend. This ensures teachers can only be assigned to sessions in semesters they're designated for, and prevents time conflicts.

---

## Database Changes

### User Model Update (`backend/models.py`)

Added `teacher_semesters` field for teachers:

```python
teacher_semesters = Column(String, nullable=True)  # JSON list of assigned semesters: '["Sem1", "Sem2"]'
```

**Example values:**

- `'["Semester 1", "Semester 2"]'`
- `'["First Year", "Second Year"]'`
- `null` (no specific semesters)

---

## API Schema Changes

### TeacherOut Schema (`backend/schemas.py`)

```python
class TeacherOut(BaseModel):
    id: str
    name: str
    email: str
    department: Optional[str]
    teacher_semesters: Optional[str] = None  # JSON list
```

### TeacherCreate Schema

```python
class TeacherCreate(BaseModel):
    name: str
    email: str
    password: str
    department: Optional[str] = None
    teacher_semesters: Optional[str] = None  # JSON list: '["Sem1", "Sem2"]'
```

### TeacherUpdate Schema

```python
class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    profile_image: Optional[str] = None
    teacher_semesters: Optional[str] = None  # JSON list
```

---

## API Endpoints

### 1. Create Teacher with Semesters

**POST** `/api/teachers`

**Request:**

```json
{
  "name": "Dr. Smith",
  "email": "smith@example.com",
  "password": "password123",
  "department": "Computer Science",
  "teacher_semesters": "[\"Sem1\", \"Sem2\"]"
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "name": "Dr. Smith",
  "email": "smith@example.com",
  "department": "Computer Science",
  "teacher_semesters": "[\"Sem1\", \"Sem2\"]"
}
```

### 2. Update Teacher Semesters

**PATCH** `/api/teachers/{teacher_id}`

**Request:**

```json
{
  "teacher_semesters": "[\"Sem1\", \"Sem2\", \"Sem3\"]"
}
```

### 3. Get Teacher Workload

**GET** `/api/teachers/{teacher_id}/workload`

**Response:**

```json
{
  "teacher_id": "uuid",
  "teacher_name": "Dr. Smith",
  "department": "Computer Science",
  "teacher_semesters": ["Sem1", "Sem2"],
  "total_subjects": 3,
  "active_sessions": 5
}
```

### 4. Create Session with Teacher Assignment

**POST** `/api/sessions`

**Request:**

```json
{
  "subject_id": "uuid",
  "teacher_id": "teacher_uuid",
  "room": "A101",
  "start_time": "09:00",
  "end_time": "10:30",
  "session_date": "2024-01-15"
}
```

**Validations:**

- ✅ Teacher exists and is active
- ✅ Time format is valid (HH:MM)
- ✅ Start time < end time
- ✅ **NEW**: No overlapping sessions for teacher on same date/time

**Error Responses:**

```json
// Invalid time format
{
  "detail": "Invalid time format. Use HH:MM"
}
```

```json
// Time conflict
{
  "detail": "Time conflict: Teacher has overlapping session(s): Math (09:00-10:00); Physics (09:30-11:00)"
}
```

```json
// Teacher not found
{
  "detail": "Teacher uuid not found or inactive"
}
```

### 5. Update Session Teacher Assignment

**PATCH** `/api/sessions/{session_id}`

**Request:**

```json
{
  "teacher_id": "new_teacher_uuid",
  "start_time": "14:00",
  "end_time": "15:30"
}
```

**Validations:** Same as create session (excludes current session from conflict check)

### 6. Assign Teacher to Subject

**POST** `/api/subjects` or **PATCH** `/api/subjects/{subject_id}`

**Request:**

```json
{
  "name": "Advanced Mathematics",
  "code": "MATH301",
  "teacher_id": "teacher_uuid",
  "schedule": "MWF 9:00-10:00"
}
```

**Validations:**

- ✅ Teacher exists and is active
- ✅ Subject code is unique

---

## Validation Module (`backend/validation.py`)

### Core Functions

#### `parse_teacher_semesters(json_str: Optional[str]) -> List[str]`

Parses JSON semester string to list.

```python
semesters = parse_teacher_semesters('[\"Sem1\", \"Sem2\"]')
# Returns: ["Sem1", "Sem2"]
```

#### `check_teacher_time_conflict(...) -> List[dict]`

Detects overlapping sessions for a teacher.

```python
conflicts = check_teacher_time_conflict(
    teacher_id="uuid",
    session_date_str="2024-01-15",
    start_time_str="09:00",
    end_time_str="10:30",
    db=db
)
# Returns: [] or [{"session_id": "...", "subject_name": "...", ...}]
```

#### `get_teacher_workload(teacher_id: str, db: Session) -> dict`

Returns teacher's workload statistics.

```python
workload = get_teacher_workload(teacher_id, db)
# Returns: {"total_subjects": 3, "active_sessions": 5}
```

#### `validate_teacher_exists(teacher_id: Optional[str], db: Session) -> Optional[User]`

Validates teacher is active, raises 400 if not found.

---

## Usage Examples

### Example 1: Create Teacher with Semester Assignment

```python
# Admin creates teacher for specific semesters
POST /api/teachers
{
  "name": "Prof. Johnson",
  "email": "johnson@school.edu",
  "password": "SecurePass123",
  "department": "Physics",
  "teacher_semesters": "[\"First Year\", \"Second Year\"]"
}
```

### Example 2: Prevent Conflicting Session Assignment

```python
# Attempt to create overlapping session fails
POST /api/sessions
{
  "subject_id": "math101",
  "teacher_id": "prof_smith",
  "start_time": "09:00",    # Conflicts with existing session
  "end_time": "10:30",
  "session_date": "2024-01-15"
}

# Response (409 Conflict):
{
  "detail": "Time conflict: Teacher has overlapping session(s): Calculus (09:00-10:00)"
}
```

### Example 3: Update Teacher Workload

```python
# Admin checks teacher workload before assignment
GET /api/teachers/prof_smith/workload

# Response:
{
  "teacher_id": "prof_smith",
  "teacher_name": "Prof. Smith",
  "department": "Mathematics",
  "teacher_semesters": ["Sem1", "Sem2"],
  "total_subjects": 5,
  "active_sessions": 12
}

# Decide if teacher can take more assignments based on workload
```

---

## Error Codes

| Code | Scenario                   | Message                                                  |
| ---- | -------------------------- | -------------------------------------------------------- |
| 400  | Invalid time format        | `Invalid time format. Use HH:MM`                         |
| 400  | Start >= end time          | `Start time must be before end time`                     |
| 400  | Teacher not found/inactive | `Teacher {id} not found or inactive`                     |
| 404  | Subject/Session not found  | `Subject not found` / `Session not found`                |
| 409  | Time conflict              | `Time conflict: Teacher has overlapping session(s): ...` |

---

## Frontend Integration Notes

### Teachers UI

- Add semester input field (JSON list editor or multi-select)
- Show teacher workload before assignment
- Display semesters in teacher list

### Sessions UI

- Show real-time conflict warnings when assigning teacher
- Display teacher's existing sessions on same date
- Validate time format client-side

### Subjects UI

- Add teacher availability check before assignment
- Show workload indicator

---

## Database Migration (if needed)

To apply these changes to an existing database:

```sql
-- Add teacher_semesters column if it doesn't exist
ALTER TABLE users ADD COLUMN teacher_semesters TEXT NULL;
```

---

## Testing Checklist

- [ ] Create teacher with semesters
- [ ] Create session without conflicts (success)
- [ ] Create session with time conflict (409 error)
- [ ] Update session to change teacher (validates conflicts)
- [ ] Get teacher workload endpoint
- [ ] Assign teacher with invalid ID (400 error)
- [ ] Create session with invalid time format (400 error)
- [ ] Update teacher semesters

---

## Future Enhancements

1. **Semester Context in Sessions**: Add `semester` field to Session model for explicit semester association
2. **Teacher Availability Calendar**: Implement availability scheduling system
3. **Workload Limits**: Set maximum subjects/sessions per teacher
4. **Audit Trail**: Log all teacher assignment changes
5. **Conflict Resolution Suggestions**: Recommend time slot adjustments
6. **Batch Assignment**: Bulk assign teachers to multiple sessions
