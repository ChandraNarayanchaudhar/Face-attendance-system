# Teacher Assignment Validation - Quick Reference

## What's Fixed

✅ **Full Validation for Teacher Assignments**

- Teachers validated for existence and active status
- Time conflicts detected automatically
- Invalid inputs rejected with clear error messages

✅ **Semester-Based Teacher Assignment**

- Teachers now have `teacher_semesters` field (JSON list)
- Can be assigned to specific semesters
- Ready for semester matching validation

✅ **Time Conflict Detection**

- Prevents same teacher from teaching overlapping sessions
- Checks same date/time only
- Returns conflicting session details

---

## Key Files Changed

| File                          | Changes                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `backend/models.py`           | Added `teacher_semesters` column to User model                    |
| `backend/schemas.py`          | Updated TeacherOut/Create/Update schemas with `teacher_semesters` |
| `backend/validation.py`       | **NEW** - Validation utilities for teacher assignments            |
| `backend/routers/teachers.py` | Added semester validation, new workload endpoint                  |
| `backend/routers/sessions.py` | Added conflict detection, time validation                         |
| `backend/routers/subjects.py` | Added teacher existence validation                                |

---

## Testing Quick Commands

### 1. Create Teacher with Semesters

```bash
curl -X POST http://localhost:8000/api/teachers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Test",
    "email": "test@school.edu",
    "password": "password123",
    "department": "CS",
    "teacher_semesters": "[\"Sem1\", \"Sem2\"]"
  }'
```

### 2. Check for Conflicts

Create session at 09:00-10:30, then try to create another at 09:15-10:45 for same teacher:

```bash
curl -X POST http://localhost:8000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "subject_id": "...",
    "teacher_id": "...",
    "start_time": "09:15",
    "end_time": "10:45",
    "session_date": "2024-01-15"
  }'
# Should return 409 Conflict
```

### 3. Get Teacher Workload

```bash
curl http://localhost:8000/api/teachers/{teacher_id}/workload
```

---

## Error Examples

### Invalid Time Format

```json
{
  "detail": "Invalid time format. Use HH:MM"
}
```

### Time Conflict

```json
{
  "detail": "Time conflict: Teacher has overlapping session(s): Math (09:00-10:00); Physics (09:30-11:00)"
}
```

### Teacher Not Found

```json
{
  "detail": "Teacher {uuid} not found or inactive"
}
```

---

## API Status Codes

- **201** - Created successfully
- **204** - Deleted successfully
- **400** - Bad request (validation failed)
- **404** - Resource not found
- **409** - Conflict (time overlap)

---

## Next Steps (Frontend)

1. Add semester multi-select input for teachers
2. Show conflict warnings when assigning teachers to sessions
3. Display teacher workload before assignment
4. Validate time format on client-side
5. Show existing sessions for teacher on selected date
