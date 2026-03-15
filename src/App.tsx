/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  FileText, 
  User, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Download, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export default function App() {
  const [formData, setFormData] = useState({
    nombreProfesional: '',
    nombrePaciente: '',
    fecha: new Date(),
    reportePsicologico: '',
    recomendaciones: ''
  });

  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    reportePsicologico: false,
    recomendaciones: false,
    exporting: false
  });

  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleInputChange = (field: string, value: string | Date | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const improveWithAI = async (field: 'reportePsicologico' | 'recomendaciones') => {
    const textToImprove = formData[field];
    if (!textToImprove || textToImprove.trim().length < 10) {
      setStatus({ type: 'error', message: 'Por favor, escribe al menos un párrafo para mejorar.' });
      return;
    }

    setLoading(prev => ({ ...prev, [field]: true }));
    setStatus(null);

    try {
      const model = "gemini-3-flash-preview";
      const prompt = `Actúa como un psicólogo experto con excelente redacción. 
      Mejora el siguiente texto de un reporte psicológico, corrigiendo ortografía, sintaxis y mejorando la fluidez profesional sin cambiar el significado original ni los datos clínicos.
      
      Texto a mejorar:
      "${textToImprove}"
      
      Responde ÚNICAMENTE con el texto mejorado, sin introducciones ni explicaciones adicionales.`;

      const result = await genAI.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const improvedText = result.text;
      if (improvedText) {
        handleInputChange(field, improvedText.trim());
        setStatus({ type: 'success', message: 'Texto mejorado con éxito.' });
      }
    } catch (error) {
      console.error("Error improving text:", error);
      setStatus({ type: 'error', message: 'Hubo un error al conectar con la IA. Inténtalo de nuevo.' });
    } finally {
      setLoading(prev => ({ ...prev, [field]: false }));
    }
  };

  const exportToWord = async () => {
    setLoading(prev => ({ ...prev, exporting: true }));
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: "INFORME PSICOLÓGICO",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Profesional: ", bold: true }),
                  new TextRun(formData.nombreProfesional),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Paciente: ", bold: true }),
                  new TextRun(formData.nombrePaciente),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Fecha: ", bold: true }),
                  new TextRun(formData.fecha.toLocaleDateString()),
                ],
                spacing: { after: 400 },
              }),
              new Paragraph({
                text: "REPORTE PSICOLÓGICO",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: formData.reportePsicologico,
                spacing: { after: 400 },
              }),
              new Paragraph({
                text: "RECOMENDACIONES",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: formData.recomendaciones,
                spacing: { after: 400 },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Informe_Psicologico_${formData.nombrePaciente.replace(/\s+/g, '_') || 'Sin_Nombre'}.docx`);
      setStatus({ type: 'success', message: 'Documento exportado correctamente.' });
    } catch (error) {
      console.error("Error exporting to Word:", error);
      setStatus({ type: 'error', message: 'Error al generar el documento Word.' });
    } finally {
      setLoading(prev => ({ ...prev, exporting: false }));
    }
  };

  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-900 px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">INFORMER 3.5 PSICO</h1>
            <p className="text-slate-400 text-sm max-w-md">
              Herramienta profesional para la redacción y gestión de informes psicológicos asistida por inteligencia artificial.
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 space-y-8">
          
          {/* Status Messages */}
          <AnimatePresence>
            {status && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg text-sm font-medium",
                  status.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                )}
              >
                {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                {status.message}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre Profesional */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                Nombre del Profesional
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.nombreProfesional}
                onChange={(e) => handleInputChange('nombreProfesional', e.target.value)}
                placeholder="Ej. Dr. Juan Pérez"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <div className="text-[10px] text-slate-400 text-right">
                {formData.nombreProfesional.length}/100 caracteres
              </div>
            </div>

            {/* Nombre Paciente */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                Nombre del Paciente
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.nombrePaciente}
                onChange={(e) => handleInputChange('nombrePaciente', e.target.value)}
                placeholder="Ej. María García"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <div className="text-[10px] text-slate-400 text-right">
                {formData.nombrePaciente.length}/100 caracteres
              </div>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                Fecha del Informe
              </label>
              <DatePicker
                selected={formData.fecha}
                onChange={(date) => handleInputChange('fecha', date)}
                dateFormat="dd/MM/yyyy"
                className="w-full"
              />
            </div>
          </div>

          {/* Reporte Psicológico */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="w-4 h-4 text-slate-400" />
                Reporte Psicológico
              </label>
              <button
                onClick={() => improveWithAI('reportePsicologico')}
                disabled={loading.reportePsicologico}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {loading.reportePsicologico ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                MEJORAR CON IA
              </button>
            </div>
            <textarea
              rows={8}
              value={formData.reportePsicologico}
              onChange={(e) => handleInputChange('reportePsicologico', e.target.value)}
              placeholder="Escriba aquí los hallazgos y observaciones clínicas..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Máximo 4000 palabras</span>
              <span>{countWords(formData.reportePsicologico)} / 4000 palabras</span>
            </div>
          </div>

          {/* Recomendaciones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="w-4 h-4 text-slate-400" />
                Recomendaciones
              </label>
              <button
                onClick={() => improveWithAI('recomendaciones')}
                disabled={loading.recomendaciones}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {loading.recomendaciones ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                MEJORAR CON IA
              </button>
            </div>
            <textarea
              rows={6}
              value={formData.recomendaciones}
              onChange={(e) => handleInputChange('recomendaciones', e.target.value)}
              placeholder="Escriba aquí las recomendaciones y pasos a seguir..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Máximo 4000 palabras</span>
              <span>{countWords(formData.recomendaciones)} / 4000 palabras</span>
            </div>
          </div>

          {/* Export Button */}
          <div className="pt-6 border-t border-slate-100">
            <button
              onClick={exportToWord}
              disabled={loading.exporting || !formData.nombrePaciente || !formData.reportePsicologico}
              className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
            >
              {loading.exporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              EXPORTAR A WORD
            </button>
            {!formData.nombrePaciente && (
              <p className="text-center text-[10px] text-slate-400 mt-2">
                * Complete al menos el nombre del paciente y el reporte para exportar.
              </p>
            )}
          </div>

        </div>
      </motion.div>

      {/* Footer */}
      <div className="mt-8 text-center text-slate-400 text-xs">
        &copy; {new Date().getFullYear()} Informer 3.5 Psico - Herramienta de Apoyo Clínico
      </div>
    </div>
  );
}
