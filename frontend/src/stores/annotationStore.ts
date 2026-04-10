import { create } from 'zustand'
import type { Annotation } from '../types/annotation'

interface AnnotationState {
  annotations: Annotation[]
  selectedAnnotation: Annotation | null
  setAnnotations: (annotations: Annotation[]) => void
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updated: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void
  setSelectedAnnotation: (annotation: Annotation | null) => void
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],
  selectedAnnotation: null,
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),
  updateAnnotation: (id, updated) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updated } : a
      ),
    })),
  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    })),
  setSelectedAnnotation: (annotation) =>
    set({ selectedAnnotation: annotation }),
}))
