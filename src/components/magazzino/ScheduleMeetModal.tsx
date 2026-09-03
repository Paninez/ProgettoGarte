import React, { useState, useEffect } from "react";
import { X, Calendar, Video, Mail, Users, AlertCircle } from "lucide-react";
import { OggettoMagazzino, Carrello, DettaglioCarrello } from "../../types";
import { initAuth, googleSignIn, logout, getAccessToken } from "../../lib/firebase";
import { fetchWithRetry } from "../../lib/googleApi";
import type { User } from 'firebase/auth';

interface ScheduleMeetModalProps {
  item: OggettoMagazzino;
  carrelli: Carrello[];
  dettagli: DettaglioCarrello[];
  onClose: () => void;
}

export const ScheduleMeetModal: React.FC<ScheduleMeetModalProps> = ({ item, carrelli, dettagli, onClose }) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  
  const [eventTitle, setEventTitle] = useState(`Q&A: ${item.Nome}`);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventDescription, setEventDescription] = useState(`Ciao! Ti invitiamo ad una call dedicata all'oggetto ${item.Nome} che hai acquistato.`);
  
  const [emails, setEmails] = useState<string[]>([]);

  useEffect(() => {
    // Trova tutti i carrelli che hanno questo oggetto
    const relatedCartIds = dettagli
      .filter(d => d.ID_Oggetto === item.ID_Oggetto)
      .map(d => d.ID_Carrello);
      
    // Estrai le email uniche
    const uniqueEmails = Array.from(new Set(
      carrelli
        .filter(c => relatedCartIds.includes(c.ID_Carrello) && c.Email && c.Email.trim().length > 0)
        .map(c => c.Email!)
    ));
    
    setEmails(uniqueEmails);

    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        setNeedsAuth(false);
      },
      () => setNeedsAuth(true)
    );
    
    return () => unsubscribe();
  }, [item, carrelli, dettagli]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (error) {
      console.error("Login failed", error);
      alert("Errore durante il login con Google.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("Devi effettuare l'accesso a Google per creare l'evento.");
      return;
    }
    
    if (emails.length === 0) {
      alert("Nessun cliente con indirizzo email valido trovato per questo oggetto.");
      return;
    }

    if (!eventDate || !eventTime) {
      alert("Seleziona data e ora.");
      return;
    }
    
    const confirm = window.confirm(`Stai per inviare un invito a ${emails.length} persone. Vuoi procedere?`);
    if (!confirm) return;

    setIsScheduling(true);

    try {
      const startDateTime = new Date(`${eventDate}T${eventTime}`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration
      
      const eventData = {
        summary: eventTitle,
        description: eventDescription,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: emails.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        }
      };

      const res = await fetchWithRetry("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(eventData)
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error("Google Calendar API Error:", errData);
        throw new Error(errData.error?.message || "Errore sconosciuto da Google Calendar");
      }

      const createdEvent = await res.json();
      alert(`Evento creato con successo! Link Meet: ${createdEvent.hangoutLink}`);
      onClose();
    } catch (error: any) {
      console.error("Failed to schedule event", error);
      alert(`Errore durante la creazione dell'evento: ${error.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Organizza Google Meet</h2>
              <p className="text-sm text-slate-500">Per: {item.Nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {needsAuth ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-slate-900">Collega Google Calendar</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Per pianificare un meeting e inviare gli inviti tramite Google Meet, devi accedere con il tuo account Google.
              </p>
              
              <button 
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button mx-auto flex items-center justify-center w-full max-w-xs px-4 py-2 border border-slate-300 rounded-md bg-white hover:bg-slate-50 transition-colors shadow-sm"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper flex items-center gap-3">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5" style={{display: 'block'}}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents text-slate-700 font-medium">{isLoggingIn ? "Accesso in corso..." : "Sign in with Google"}</span>
                </div>
              </button>
            </div>
          ) : (
            <form id="meet-form" onSubmit={handleSchedule} className="space-y-5">
              
              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 text-sm">Destinatari dell'invito</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Sono stati trovati <strong>{emails.length}</strong> clienti con un'email valida che hanno acquistato questo oggetto.
                  </p>
                </div>
              </div>

              {emails.length === 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Non è possibile procedere perché nessun cliente che ha acquistato questo oggetto ha fornito un indirizzo email nel proprio carrello.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Titolo Evento</label>
                  <input
                    type="text"
                    required
                    value={eventTitle}
                    onChange={e => setEventTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={e => setEventDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ora Inizio</label>
                    <input
                      type="time"
                      required
                      value={eventTime}
                      onChange={e => setEventTime(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione dell'invito</label>
                  <textarea
                    required
                    rows={3}
                    value={eventDescription}
                    onChange={e => setEventDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {!needsAuth && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 sticky bottom-0">
            <button 
              type="button" 
              onClick={logout}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              Disconnetti ({user?.email})
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                Annulla
              </button>
              <button
                type="submit"
                form="meet-form"
                disabled={isScheduling || emails.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isScheduling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creazione...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Pianifica e Invia
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
