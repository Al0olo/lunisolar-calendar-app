import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import Papa from 'papaparse';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Set up the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

const LunarCalendar = () => {
  const [events, setEvents] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setDebugInfo('Fetching CSV file...');
        
        // Fetch the CSV file from the public folder
        const response = await fetch('/moon-phases-601-to-2100-UT.csv');
        const csvText = await response.text();
        
        setDebugInfo('Parsing CSV data...');
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            setDebugInfo(`Parsed ${results.data.length} rows from CSV`);
            
            if (results.data.length === 0) {
              throw new Error('No data found in CSV file');
            }

            setDebugInfo('Formatting events...');
            const formattedEvents = results.data.map((row, index) => {
              // Log each row for debugging
              console.log(`Row ${index}:`, row);
              
              // Parse the date using moment.js
              const eventDate = moment(row.datetime, 'YYYY-MM-DD HH:mm:ss');
              
              if (!eventDate.isValid()) {
                console.warn(`Invalid date at row ${index}: ${row.datetime}`);
                return null;
              }
              
              return {
                title: row.phase,
                start: eventDate.toDate(),
                end: eventDate.toDate(),
                allDay: true,
                friendlyDate: row.friendlydate
              };
            }).filter(event => event !== null);

            setDebugInfo(`Formatted ${formattedEvents.length} valid events`);
            
            if (formattedEvents.length === 0) {
              throw new Error('No valid events found after parsing');
            }

            setEvents(formattedEvents);
            setDebugInfo('Events set. Setting start date...');
            setStartDate(formattedEvents[0].start);
            setDebugInfo('Start date set.');
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

  const EventComponent = ({ event }) => (
    <div>
      <strong>{event.title}</strong>
      <br />
      {event.friendlyDate}
    </div>
  );

  if (isLoading) {
    return <div>Loading... Debug info: {debugInfo}</div>;
  }

  if (error) {
    return <div>Error: {error}<br />Debug info: {debugInfo}</div>;
  }

  if (events.length === 0) {
    return <div>No events found. Please check your CSV file.<br />Debug info: {debugInfo}</div>;
  }

  return (
    <div className="h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Lunar Phase Calendar</h1>
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
      <div className="mt-4 text-sm text-gray-600">Debug info: {debugInfo}</div>
    </div>
  );
};

export default LunarCalendar;