import React from 'react';
import QRCode from 'react-qr-code';
import { cn } from '../lib/utils';
import { RTOS } from '../lib/rtoConfig';
import { Student } from '../types';
import { BookOpen } from 'lucide-react';

interface StudentCardProps {
  student: Student;
  className?: string;
  isViewMode?: boolean;
}

export function StudentCard({ student, className, isViewMode = false }: StudentCardProps) {
  const rto = RTOS.find(r => r.id === student.rtoId) || RTOS[0];

  return (
    <div 
      className={cn("w-full max-w-[340px] mx-auto rounded-[24px] overflow-hidden shadow-2xl relative flex flex-col font-sans", className)}
      style={{ backgroundColor: rto.primaryColor, color: rto.textColor }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 pb-2">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          {rto.logoUrl ? (
            <img 
              src={rto.logoUrl} 
              alt={`${rto.shortName} Logo`} 
              className={rto.id === 'reach' ? "h-12 object-contain" : "h-10 object-contain"}
            />
          ) : (
            <BookOpen className="w-8 h-8" strokeWidth={1.5} />
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-semibold opacity-90 tracking-wider">Student ID</p>
          <p className="text-lg font-medium">{student.studentNumber}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 pt-2 flex-grow">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <p className="text-[10px] uppercase font-semibold opacity-90 mb-1 tracking-wider">Status</p>
            <p className="text-3xl leading-none font-medium mb-1">{student.status}</p>
            <p className="text-3xl leading-none font-medium mb-1">Student</p>
          </div>
          <div 
            className="w-20 h-24 rounded-lg overflow-hidden shrink-0 ml-4 shadow-sm border border-current"
            style={{ borderColor: 'color-mix(in srgb, currentColor 20%, transparent)', backgroundColor: 'color-mix(in srgb, currentColor 5%, transparent)' }}
          >
            {student.photoData ? (
              <img src={student.photoData} alt="Student" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-50 text-xs text-center p-2">
                No Photo
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-end mb-4 gap-4">
          <div className="flex-1">
            <p className="text-[10px] uppercase font-semibold opacity-80 tracking-wider">Student Name</p>
            <p className="text-sm font-medium truncate">{student.firstName} {student.lastName}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase font-semibold opacity-80 tracking-wider">Commenced Date</p>
            <p className="text-sm font-medium">{student.commencedDate}</p>
          </div>
        </div>

        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <p className="text-[10px] uppercase font-semibold opacity-80 tracking-wider">Campus</p>
            <p className="text-sm font-medium truncate">{student.campus}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase font-semibold opacity-80 tracking-wider">DOB</p>
            <p className="text-sm font-medium">{student.dob}</p>
          </div>
        </div>
      </div>

      {/* Barcode Section (QR Code) */}
      <div 
        className="p-6 pt-4 mt-auto"
        style={{ backgroundColor: 'color-mix(in srgb, currentColor 5%, transparent)' }}
      >
        <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center text-black shadow-sm" style={{ border: '1px solid color-mix(in srgb, currentColor 10%, transparent)' }}>
          <div className="w-[110px] h-[110px]">
            <QRCode 
              value={student.studentNumber} 
              size={110}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
            />
          </div>
          <p className="font-mono text-xs mt-2.5 tracking-widest font-bold text-gray-800">{student.studentNumber}</p>
        </div>
      </div>
    </div>
  );
}
