export const eventTypeLabels: Record<string, string> = {
  GENERAL: 'General',
  ACADEMIC: 'Academico',
  TALK: 'Charla',
  WORKSHOP: 'Taller',
  TOURNAMENT: 'Torneo',
  HACKATHON: 'Hackathon',
  CEREMONY: 'Ceremonia',
  OTHER: 'Otro',
};

export const eventStatusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  CANCELLED: 'Cancelado',
  FINISHED: 'Finalizado',
};

export const attendanceStatusLabels: Record<string, string> = {
  REGISTERED: 'Registrado',
  CHECKED_IN: 'Ingreso confirmado',
  CANCELLED: 'Cancelado',
};

export const attendanceMethodLabels: Record<string, string> = {
  QR: 'QR',
  MANUAL: 'Manual',
  TEMPORARY_CODE: 'Codigo temporal',
};

export const attendeeCategoryLabels: Record<string, string> = {
  ESTUDIANTE: 'Estudiante',
  PROFESOR: 'Profesor',
  ADMINISTRATIVO: 'Administrativo',
  GRADUADO: 'Graduado',
  OTRO: 'Otro',
};

export const userStatusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  BLOCKED: 'Bloqueado',
  PENDING: 'Pendiente',
};

export const userPositionLabels: Record<string, string> = {
  DIRECTIVO: 'Directivo',
  PROFESOR: 'Profesor',
  REPRESENTANTE: 'Representante',
  ESTUDIANTE: 'Estudiante',
};

export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN: 'Administrador',
  COORDINADOR: 'Coordinador',
  JURADO: 'Jurado',
  PONENTE: 'Ponente',
  LOGISTICA: 'Logistica',
  PARTICIPANTE: 'Participante',
};

export const tournamentSportLabels: Record<string, string> = {
  FUTBOL: 'Futbol',
  BALONCESTO: 'Baloncesto',
  VIDEOJUEGOS: 'Videojuegos',
  PING_PONG: 'Ping pong',
  AJEDREZ: 'Ajedrez',
  ROBOTICA: 'Robotica',
  VOLEIBOL: 'Voleibol',
  MARATON_PROGRAMACION: 'Maraton de programacion',
  CAPTURA_BANDERA: 'Captura la bandera',
};

export const competitionModeLabels: Record<string, string> = {
  TEAM: 'Por equipos',
  INDIVIDUAL: 'Individual',
};

export const videoGameTitleLabels: Record<string, string> = {
  FIFA: 'FIFA',
  CALL_OF_DUTY: 'Call of Duty',
};

export const tournamentFormatLabels: Record<string, string> = {
  GROUPS: 'Fase de grupos',
  KNOCKOUT: 'Eliminacion directa',
  ROUND_ROBIN: 'Todos contra todos',
  MIXED: 'Grupos y eliminatorias',
};

export const tournamentStatusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  REGISTRATION_OPEN: 'Inscripciones abiertas',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

export const tournamentRulePresetLabels: Record<string, string> = {
  FOOTBALL: 'Reglas de futbol',
  BASKETBALL: 'Reglas de baloncesto',
  VIDEO_GAME: 'Reglas de videojuegos',
  TABLE_TENNIS: 'Reglas de ping pong',
  CHESS: 'Reglas de ajedrez',
  ROBOTICS_BATTLE: 'Batalla robotica',
  CUSTOM: 'Personalizadas',
};

export const tournamentPhaseLabels: Record<string, string> = {
  FASE_GRUPOS: 'Fase de grupos',
  OCTAVOS: 'Octavos',
  CUARTOS: 'Cuartos',
  SEMIFINAL: 'Semifinal',
  FINAL: 'Final',
};

export const matchStatusLabels: Record<string, string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En vivo',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

export const hackathonStatusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  REGISTRATION_OPEN: 'Inscripciones abiertas',
  IN_PROGRESS: 'En curso',
  EVALUATION: 'En evaluacion',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

export const deliverableTypeLabels: Record<string, string> = {
  PDF: 'PDF',
  ZIP: 'ZIP',
  GITHUB_URL: 'Repositorio GitHub',
  VIDEO_URL: 'Video',
  PRESENTATION: 'Presentacion',
  OTHER: 'Otro',
};

export function labelFor(labels: Record<string, string>, value?: string | null) {
  if (!value) {
    return '';
  }

  return labels[value] || value;
}
