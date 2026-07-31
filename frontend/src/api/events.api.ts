import client from './client';
import { endpoints } from './endpoints';
import { sendListEmailRequest } from './notifications.api';

export type EventItem = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  type: string;
  status: string;
  modality: string;
  streamUrl?: string | null;
  startsAt: string;
  endsAt: string;
  capacity?: number | null;
  venue?: {
    id: string;
    name: string;
    location?: string | null;
    photoUrl?: string | null;
  } | null;
  responsibles?: Array<{
    id: string;
    roleNote?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  talk?: {
    id: string;
    topic: string;
    speaker?: {
      id?: string;
      fullName: string;
      email?: string | null;
      company?: string | null;
      bio?: string | null;
      photoUrl?: string | null;
    } | null;
  } | null;
};

export type AttendanceItem = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  identifier?: string | null;
  category?: string | null;
  semester?: string | null;
  career?: string | null;
  whatsappConsent: boolean;
  status: string;
  method: string;
  qrCode?: string | null;
  tempCode?: string | null;
  checkedInAt?: string | null;
  user?: {
    name: string;
    email: string;
    universityCode?: string | null;
  } | null;
};

export type PublicEventForm = {
  event: {
    id: string;
    title: string;
    type: string;
    status: string;
    modality: string;
    streamUrl?: string | null;
    startsAt: string;
    endsAt: string;
    capacity?: number | null;
  };
  mode: 'registration' | 'attendance';
  url: string;
  attendanceOpensAt: string;
  attendanceClosesAt: string;
};

export type PublicEventItem = EventItem & {
  registrationUrl?: string | null;
  attendanceUrl?: string | null;
  attendanceOpensAt: string;
  attendanceClosesAt: string;
};

export type AttendanceStats = {
  capacity: number | null;
  total: number;
  registered: number;
  checkedIn: number;
  cancelled: number;
  activeTotal: number;
  available: number | null;
  checkInRate: number;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function listEventsRequest(filters?: { search?: string; type?: string; status?: string }) {
  const response = await client.get<ApiResponse<EventItem[]>>(endpoints.events.list(), {
    params: filters,
  });

  return response.data.data;
}

export async function getEventRequest(id: string) {
  const response = await client.get<ApiResponse<EventItem>>(endpoints.events.detail(id));

  return response.data.data;
}

export async function createEventRequest(input: {
  title: string;
  description?: string | null;
  type: string;
  status: string;
  modality?: string;
  streamUrl?: string | null;
  startsAt: string;
  endsAt: string;
  venueId?: string | null;
  capacity?: number | null;
}) {
  const response = await client.post<ApiResponse<EventItem>>(endpoints.events.create(), {
    ...input,
    venueId: input.venueId || null,
    streamUrl: input.streamUrl || null,
    capacity: input.capacity || null,
  });

  return response.data.data;
}

export async function updateEventRequest(
  id: string,
  input: {
    title?: string;
    description?: string | null;
    type?: string;
    status?: string;
    modality?: string;
    streamUrl?: string | null;
    startsAt?: string;
    endsAt?: string;
    venueId?: string | null;
    capacity?: number | null;
  }
) {
  const response = await client.patch<ApiResponse<EventItem>>(endpoints.events.detail(id), {
    ...input,
    venueId: input.venueId === '' ? null : input.venueId,
    streamUrl: input.streamUrl === '' ? null : input.streamUrl,
  });

  return response.data.data;
}

export async function deleteEventRequest(id: string) {
  await client.delete(endpoints.events.detail(id));
}

export async function addEventResponsibleRequest(
  eventId: string,
  input: { userId: string; roleNote?: string }
) {
  const response = await client.post<ApiResponse<EventItem['responsibles'][number]>>(
    endpoints.events.responsibles(eventId),
    input
  );

  return response.data.data;
}

export async function listAttendanceRequest(eventId: string) {
  const response = await client.get<ApiResponse<AttendanceItem[]>>(
    endpoints.events.attendance(eventId)
  );

  return response.data.data;
}

export async function createAttendanceRequest(
  eventId: string,
  input: {
    fullName: string;
    email?: string;
    identifier?: string;
    category?: string;
    semester?: string;
    career?: string;
  }
) {
  const response = await client.post<ApiResponse<AttendanceItem>>(
    endpoints.events.attendance(eventId),
    {
      fullName: input.fullName,
      email: input.email || null,
      identifier: input.identifier || null,
      category: input.category || null,
      semester: input.semester || null,
      career: input.career || null,
      method: 'MANUAL',
      status: 'CHECKED_IN',
    }
  );

  return response.data.data;
}

export async function preregisterAttendanceRequest(
  eventId: string,
  input: { fullName: string; email?: string; identifier?: string; category?: string }
) {
  const response = await client.post<ApiResponse<AttendanceItem>>(
    endpoints.events.preregisterAttendance(eventId),
    {
      fullName: input.fullName,
      email: input.email || null,
      identifier: input.identifier || null,
      category: input.category || null,
      method: 'QR',
      status: 'REGISTERED',
    }
  );

  return response.data.data;
}

export async function scanAttendanceRequest(
  eventId: string,
  input: { qrCode?: string; tempCode?: string }
) {
  const response = await client.post<ApiResponse<AttendanceItem>>(
    endpoints.events.scanAttendance(eventId),
    input
  );

  return response.data.data;
}

export async function getAttendanceStatsRequest(eventId: string) {
  const response = await client.get<ApiResponse<AttendanceStats>>(
    endpoints.events.attendanceStats(eventId)
  );

  return response.data.data;
}

export async function getAttendanceQrSvgRequest(attendanceId: string) {
  const response = await client.get<string>(endpoints.attendance.qr(attendanceId), {
    responseType: 'text',
  });

  return response.data;
}

export async function getAttendanceCertificateRequest(attendanceId: string) {
  const response = await client.get<string>(endpoints.attendance.certificate(attendanceId), {
    responseType: 'text',
  });

  return response.data;
}

export async function sendEventAttendanceListRequest(
  eventId: string,
  input: { recipients: string[]; subject: string; body: string }
) {
  return sendListEmailRequest({
    targetType: 'EVENT',
    targetId: eventId,
    ...input,
  });
}

export async function updateAttendanceStatusRequest(attendanceId: string, status: string) {
  const response = await client.patch<ApiResponse<AttendanceItem>>(
    endpoints.attendance.detail(attendanceId),
    { status }
  );

  return response.data.data;
}

export async function getPublicEventFormRequest(
  eventId: string,
  mode: 'registration' | 'attendance',
  origin = window.location.origin
) {
  const response = await client.get<ApiResponse<PublicEventForm>>(endpoints.public.eventForm(eventId), {
    params: { mode, origin },
  });

  return response.data.data;
}

export async function listPublicEventsRequest(origin = window.location.origin) {
  const response = await client.get<ApiResponse<PublicEventItem[]>>(endpoints.public.events(), {
    params: { origin },
  });

  return response.data.data;
}

export async function getPublicEventQrSvgRequest(
  eventId: string,
  mode: 'registration' | 'attendance',
  origin = window.location.origin
) {
  const response = await client.get<string>(endpoints.public.eventFormQr(eventId), {
    params: { mode, origin },
    responseType: 'text',
  });

  return response.data;
}

export async function publicRegisterEventRequest(
  eventId: string,
  input: {
    fullName: string;
    identifier: string;
    category: string;
    semester: string;
    career: string;
    email?: string | null;
    whatsappConsent: boolean;
  }
) {
  const response = await client.post<ApiResponse<AttendanceItem>>(
    endpoints.public.eventRegister(eventId),
    input
  );

  return response.data.data;
}

export async function publicCheckInEventRequest(
  eventId: string,
  input: {
    fullName?: string;
    identifier: string;
    category?: string;
    semester?: string;
    career?: string;
    email?: string | null;
    whatsappConsent?: boolean;
  }
) {
  const response = await client.post<ApiResponse<AttendanceItem>>(
    endpoints.public.eventCheckIn(eventId),
    input
  );

  return response.data.data;
}
