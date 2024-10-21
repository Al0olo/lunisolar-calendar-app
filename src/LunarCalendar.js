import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Papa from 'papaparse';
import moment from 'moment';
import './LunisolarHijriCalendar.css';


const LunisolarHijriCalendar = () => {
  const [events, setEvents] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const phaseColors = {
    'New Moon': 'rgb(0, 231, 255)',
    'First Quarter': '#66CCFF',
    'Full Moon': '#FFFF00',
    'Last Quarter': '#FF9933'
  };

  const hijriMonths = [
    "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Ula", "Jumada al-Thani", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/moon-phases-601-to-4000-with-eclipses-UT.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            const { lunisolarEvents, earliestDate } = processLunisolarData(results.data);
            setEvents(lunisolarEvents);
            setStartDate(earliestDate);
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
    let hijriYear = null;
    let hijriMonth = 1;
    let hijriDay = 1;
    let isOddMonth = true;
    const HIJRI_EPOCH = 622;
    const HIJRI_EPOCH_DATE = moment('622-07-16', 'YYYY-MM-DD');
    const SOLAR_YEAR = 365.2422;
    const LUNAR_YEAR = 354.36707;
    const events = [];
    let lastFullMoon = null;
    let accumulatedDrift = 0;
    let earliestDate = null;

    data.forEach((row, index) => {
      const gregorianDate = moment(row.datetime, 'YYYY-MM-DD HH:mm:ss');
      
      if (!earliestDate || gregorianDate.isBefore(earliestDate)) {
        earliestDate = gregorianDate.toDate();
      }

      if (gregorianDate.isSameOrAfter(HIJRI_EPOCH_DATE)) {
        if (hijriYear === null) {
          const yearsSinceEpoch = gregorianDate.diff(HIJRI_EPOCH_DATE, 'years', true);
          hijriYear = Math.floor(yearsSinceEpoch * (SOLAR_YEAR / LUNAR_YEAR)) + 1;
        }

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
        }
      }

      const hijriDateString = hijriYear !== null 
        ? `${hijriYear} ${hijriMonths[hijriMonth - 1]} ${hijriDay}` 
        : 'Pre-Hijri';

      events.push({
        title: `${row.phase}${hijriYear !== null ? ` - Hijri: ${hijriDateString}` : ''}`,
        start: gregorianDate.toDate(),
        allDay: true,
        extendedProps: {
          hijriDate: hijriDateString,
          gregorianDate: gregorianDate.format('YYYY-MM-DD'),
          phase: row.phase
        },
        backgroundColor: phaseColors[row.phase] || 'gray',
        textColor: row.phase === 'Full Moon' || row.phase === 'New Moon' ? 'black' : 'white',
      });
    });

    return { lunisolarEvents: events, earliestDate };
  };

  const renderEventContent = (eventInfo) => {
    return (
      <>
        <b>{eventInfo.event.extendedProps.phase}</b>
        <br />
        {eventInfo.event.extendedProps.hijriDate !== 'Pre-Hijri' && (
          <>
            Hijri: {eventInfo.event.extendedProps.hijriDate}
            <br />
          </>
        )}
        Gregorian: {eventInfo.event.extendedProps.gregorianDate}
      </>
    )
  }

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (events.length === 0) return <div>No events found. Please check your CSV file.</div>;

  return (
    <div className="h-screen p-4 calendar-container">
      <h1 className="text-2xl font-bold mb-4">Lunisolar Hijri Calendar</h1>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={startDate}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridYear,dayGridMonth,dayGridWeek,dayGridDay'
        }}
        events={events}
        eventContent={renderEventContent}
        height="auto"
      />
    </div>
  );
};

export default LunisolarHijriCalendar;