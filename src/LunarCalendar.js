import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import Papa from 'papaparse';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const LunisolarHijriCalendar = () => {
  const [events, setEvents] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const phaseColors = {
    'New Moon': 'rgb(0 231 255)',
    'First Quarter': '#66CCFF',
    'Full Moon': '#FFFF00',
    'Last Quarter': '#FF9933'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/moon-phases-601-to-2100-UT.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            const lunisolarEvents = processLunisolarData(results.data);
            setEvents(lunisolarEvents);
            if (lunisolarEvents.length > 0) {
              setStartDate(lunisolarEvents[0].start);
            }
            setIsLoading(false);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setError('Error parsing CSV file');
            setIsLoading(false);
          }
        });
      } catch (error) {
        console.error('Error in data fetching or processing:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const processLunisolarData = (data) => {
    let hijriYear = 1;
    let hijriMonth = 1;
    let hijriDay = 1;
    let isOddMonth = true;
    const HIJRI_EPOCH = 622;
    const SOLAR_YEAR = 365.2422;
    const LUNAR_YEAR = 354.36707;
    const events = [];
    let lastFullMoon = null;
    let accumulatedDrift = 0;

    data.forEach((row, index) => {
      const gregorianDate = moment(row.datetime, 'YYYY-MM-DD HH:mm:ss');
      
      // Calculate Hijri date for all phases
      if (lastFullMoon) {
        const daysSinceLastFullMoon = gregorianDate.diff(lastFullMoon, 'days');
        hijriDay += daysSinceLastFullMoon;
        
        while (hijriDay > (isOddMonth ? 30 : 29)) {
          hijriDay -= isOddMonth ? 30 : 29;
          hijriMonth++;
          isOddMonth = !isOddMonth;

          if (hijriMonth > 12) {
            hijriMonth = 1;
            hijriYear++;

            accumulatedDrift += (SOLAR_YEAR - LUNAR_YEAR);
            if (accumulatedDrift >= LUNAR_YEAR) {
              hijriMonth++;
              accumulatedDrift -= LUNAR_YEAR;
            }
          }
        }
      }
      
      if (row.phase === 'Full Moon') {
        lastFullMoon = gregorianDate;

        const gregorianYear = gregorianDate.year();
        if (gregorianYear >= HIJRI_EPOCH) {
          const yearsSinceEpoch = gregorianYear - HIJRI_EPOCH;
          hijriYear = Math.floor(yearsSinceEpoch * (SOLAR_YEAR / LUNAR_YEAR)) + 1;
        }
      }

      // Create event for all phases
      events.push({
        title: `${row.phase} - Hijri: ${hijriYear}-${hijriMonth}-${hijriDay}`,
        start: gregorianDate.toDate(),
        end: gregorianDate.clone().add(1, 'day').toDate(),
        allDay: true,
        hijriDate: `${hijriYear}-${hijriMonth}-${hijriDay}`,
        gregorianDate: gregorianDate.format('YYYY-MM-DD'),
        phase: row.phase
      });
    });

    return events;
  };

  const EventComponent = ({ event }) => (
    <div style={{ 
      backgroundColor: phaseColors[event.phase] || 'gray',
      color: event.phase === 'Full Moon' || event.phase === 'New Moon' ? 'black' : 'white',
      padding: '2px',
      borderRadius: '4px'
    }}>
      <strong>{event.phase}</strong>
      <br />
      Hijri: {event.hijriDate}
      <br />
      Gregorian: {event.gregorianDate}
    </div>
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (events.length === 0) return <div>No events found. Please check your CSV file.</div>;

  return (
    <div className="h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Lunisolar Hijri Calendar</h1>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 'calc(100% - 60px)' }}
        components={{
          event: EventComponent
        }}
        date={startDate}
        onNavigate={(date) => setStartDate(date)}
      />
    </div>
  );
};

export default LunisolarHijriCalendar;