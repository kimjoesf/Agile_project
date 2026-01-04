import PDFDocument from 'pdfkit';

/**
 * Generates a PDF transcript for a student
 * @param {Object} student - Student object with user info
 * @param {Array} courses - Array of course objects
 * @param {number} gpa - Student GPA
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateTranscriptPDF(student, courses, gpa) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('OFFICIAL TRANSCRIPT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text('University Management System', { align: 'center' });
      doc.moveDown(2);

      // Student Information Section
      doc.fontSize(14).font('Helvetica-Bold').text('STUDENT INFORMATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      
      const studentInfo = [
        ['Name:', `${student.firstName} ${student.lastName}`],
        ['Student ID:', student.user.userCode],
        ['Email:', student.user.email],
        ['Date of Birth:', new Date(student.dateOfBirth).toLocaleDateString('en-US')],
        ['Enrollment Date:', new Date(student.enrollmentDate).toLocaleDateString('en-US')],
      ];

      if (student.graduationDate) {
        studentInfo.push(['Graduation Date:', new Date(student.graduationDate).toLocaleDateString('en-US')]);
      }

      studentInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`, { indent: 20 });
      });

      doc.moveDown(1.5);

      // Academic Summary
      doc.fontSize(14).font('Helvetica-Bold').text('ACADEMIC SUMMARY', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Cumulative GPA: ${gpa.toFixed(2)}`, { indent: 20 });
      doc.text(`Total Credits: ${courses.reduce((sum, c) => sum + (c.creditHours || 0), 0)}`, { indent: 20 });
      doc.moveDown(1.5);

      // Course List
      doc.fontSize(14).font('Helvetica-Bold').text('COURSE HISTORY', { underline: true });
      doc.moveDown(0.5);

      // Table Header
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidths = { code: 80, name: 200, credits: 60, grade: 60, semester: 100 };
      
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Code', tableLeft, tableTop);
      doc.text('Course Name', tableLeft + colWidths.code, tableTop);
      doc.text('Credits', tableLeft + colWidths.code + colWidths.name, tableTop);
      doc.text('Grade', tableLeft + colWidths.code + colWidths.name + colWidths.credits, tableTop);
      doc.text('Semester', tableLeft + colWidths.code + colWidths.name + colWidths.credits + colWidths.grade, tableTop);
      
      // Draw line under header
      doc.moveTo(tableLeft, tableTop + 15)
         .lineTo(tableLeft + colWidths.code + colWidths.name + colWidths.credits + colWidths.grade + colWidths.semester, tableTop + 15)
         .stroke();

      let currentY = tableTop + 25;
      doc.fontSize(10).font('Helvetica');

      // Group courses by semester/year if available
      const groupedCourses = courses.reduce((acc, course) => {
        const key = course.semester && course.year 
          ? `${course.semester} ${course.year}` 
          : 'Other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(course);
        return acc;
      }, {});

      Object.keys(groupedCourses).forEach((semester) => {
        if (semester !== 'Other') {
          doc.fontSize(11).font('Helvetica-Bold').text(semester, tableLeft, currentY);
          currentY += 15;
        }

        groupedCourses[semester].forEach((course) => {
          // Check if we need a new page
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          doc.text(course.courseCode || '-', tableLeft, currentY, { width: colWidths.code });
          doc.text(course.courseName || '-', tableLeft + colWidths.code, currentY, { width: colWidths.name });
          doc.text((course.creditHours || 0).toString(), tableLeft + colWidths.code + colWidths.name, currentY, { width: colWidths.credits, align: 'center' });
          doc.text((course.grade || 0).toFixed(2), tableLeft + colWidths.code + colWidths.name + colWidths.credits, currentY, { width: colWidths.grade, align: 'center' });
          doc.text(course.semester || '-', tableLeft + colWidths.code + colWidths.name + colWidths.credits + colWidths.grade, currentY, { width: colWidths.semester });
          
          currentY += 15;
        });

        currentY += 5; // Space between semesters
      });

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica').text(
          `Generated on ${new Date().toLocaleDateString('en-US')} - Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

