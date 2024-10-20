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
    let isOddMonth = true; // To alternate between 29 and 30 day months
    const HIJRI_EPOCH = 622; // Gregorian year when Hijri calendar starts
    const SOLAR_YEAR = 365.2422; // Average length of a solar year
    const LUNAR_YEAR = 354.36707; // Average length of a lunar year
    const events = [];
    let lastFullMoon = null;
    let accumulatedDrift = 0;

    data.forEach((row, index) => {
      const gregorianDate = moment(row.datetime, 'YYYY-MM-DD HH:mm:ss');
      
      if (row.phase === 'Full Moon') {
        // Calculate Hijri date
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

              // Calculate drift and add 13th month if necessary
              accumulatedDrift += (SOLAR_YEAR - LUNAR_YEAR);
              if (accumulatedDrift >= LUNAR_YEAR) {
                hijriMonth++;
                accumulatedDrift -= LUNAR_YEAR;
              }
            }
          }
        }
        
        lastFullMoon = gregorianDate;

        // More accurate Hijri year calculation
        const gregorianYear = gregorianDate.year();
        if (gregorianYear >= HIJRI_EPOCH) {
          const yearsSinceEpoch = gregorianYear - HIJRI_EPOCH;
          hijriYear = Math.floor(yearsSinceEpoch * (SOLAR_YEAR / LUNAR_YEAR)) + 1;
        }

        // Create event
        events.push({
          title: `Full Moon - Hijri: ${hijriYear}-${hijriMonth}-${hijriDay}`,
          start: gregorianDate.toDate(),
          end: gregorianDate.toDate(),
          allDay: true,
          hijriDate: `${hijriYear}-${hijriMonth}-${hijriDay}`,
          gregorianDate: gregorianDate.format('YYYY-MM-DD'),
        });
      }
    });

    return events;
  };

  const EventComponent = ({ event }) => (
    <div>
      <strong>{event.title}</strong>
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