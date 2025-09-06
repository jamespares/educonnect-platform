# EduConnect - Teacher Recruitment Platform

A modern, clean website for connecting UK/US teachers with teaching opportunities in China. Teachers can submit applications with their details and videos, while administrators can manage applications through a comprehensive dashboard.

## Features

### Public Features
- **Modern Landing Page**: Clean, responsive design showcasing opportunities
- **Teacher Application Form**: Comprehensive form for teacher registration including:
  - Personal details (name, email, phone, nationality)
  - Professional background (education, experience, subject specialty)
  - Video introduction upload
  - Additional information

### Admin Features
- **Dashboard Overview**: Statistics and metrics about applications
- **Application Management**: View, filter, and manage teacher applications
- **Status Tracking**: Update teacher status (pending, interviewing, employed, inactive)
- **Detailed Views**: Complete teacher profiles with video playback
- **Application Deletion**: Remove applications as needed

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js with Express
- **Database**: SQLite with custom database class
- **File Handling**: Multer for video uploads
- **Styling**: Custom CSS with responsive design

## Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. **Navigate to the project directory**:
   ```bash
   cd EduConnect
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the website**:
   - Main website: `http://localhost:3000`
   - Teacher signup: `http://localhost:3000/signup`
   - Admin dashboard: `http://localhost:3000/admin`

## File Structure

```
EduConnect/
├── index.html              # Main landing page
├── signup.html             # Teacher application form
├── admin.html              # Admin dashboard
├── server.js               # Express server
├── database.js             # Database management class
├── package.json            # Project dependencies
├── css/
│   └── style.css          # Main stylesheet
├── js/
│   └── script.js          # Client-side JavaScript
├── images/                 # Static images
├── uploads/               # Uploaded video files
└── teachers.db            # SQLite database (created automatically)
```

## API Endpoints

### Teacher Applications
- `POST /api/submit-application` - Submit a new teacher application
- `GET /api/teachers` - Get all teacher applications
- `GET /api/teachers/:id` - Get specific teacher by ID
- `PUT /api/teachers/:id/status` - Update teacher status
- `DELETE /api/teachers/:id` - Delete teacher application

### Static Routes
- `GET /` - Landing page
- `GET /signup` - Application form
- `GET /admin` - Admin dashboard

## Database Schema

### Teachers Table
- `id`: Primary key (auto-increment)
- `firstName`: Teacher's first name
- `lastName`: Teacher's last name
- `email`: Email address (unique)
- `phone`: Phone number
- `nationality`: Teacher's nationality
- `yearsExperience`: Years of teaching experience
- `education`: Educational background
- `teachingExperience`: Detailed teaching experience
- `subjectSpecialty`: Subject specialization
- `preferredLocation`: Preferred teaching location in China
- `introVideoPath`: Path to uploaded introduction video
- `additionalInfo`: Additional information
- `status`: Application status (pending, interviewing, employed, inactive)
- `createdAt`: Application submission date
- `updatedAt`: Last update date

## Usage Guide

### For Teachers
1. Visit the main website to learn about opportunities
2. Click "Join Now" or visit `/signup`
3. Fill out the comprehensive application form
4. Upload an introduction video (max 100MB)
5. Submit the application

### For Administrators
1. Visit `/admin` to access the dashboard
2. View application statistics and metrics
3. Browse the teacher applications table
4. Click "View" to see detailed teacher information including videos
5. Click "Status" to update application status
6. Click "Delete" to remove applications
7. Use "Refresh" to reload the latest data

## Configuration

### Environment Variables (Optional)
- `PORT`: Server port (default: 3000)

### File Upload Settings
- Maximum file size: 100MB
- Accepted formats: MP4, MOV, AVI
- Upload directory: `uploads/`

## Security Considerations

- Form validation on both client and server side
- File type restrictions for video uploads
- SQL injection protection through parameterized queries
- Error handling and logging

## Development

### Adding New Features
1. Update the database schema in `database.js` if needed
2. Add new API endpoints in `server.js`
3. Update the frontend HTML/CSS/JavaScript as required
4. Test thoroughly before deployment

### Database Management
The SQLite database is created automatically on first run. To reset:
1. Stop the server
2. Delete `teachers.db`
3. Restart the server

## Deployment

For production deployment:
1. Set environment variables
2. Use a process manager like PM2
3. Configure reverse proxy (nginx/Apache)
4. Set up SSL certificates
5. Configure backup for the database

## Support

For issues or questions about the EduConnect platform, please check the code comments and API documentation.

## License

This project is licensed under the MIT License.