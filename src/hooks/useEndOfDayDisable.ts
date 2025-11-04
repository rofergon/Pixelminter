import { useState, useEffect } from 'react';

/**
 * Hook para verificar si estamos en los últimos 15 minutos del día
 * El día termina a las 11:40 AM hora de Colombia (UTC-5)
 * @returns {boolean} - true si estamos en los últimos 15 minutos, false si no
 */
export const useEndOfDayDisable = (): boolean => {
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      // Obtener la hora actual en UTC
      const now = new Date();
      
      // Convertir a hora de Colombia (UTC-5)
      // Colombia usa UTC-5 todo el año (no tiene horario de verano)
      const colombiaOffset = -5 * 60; // -5 horas en minutos
      const localOffset = now.getTimezoneOffset(); // Offset del usuario en minutos
      const colombiaTime = new Date(now.getTime() + (localOffset + colombiaOffset) * 60 * 1000);
      
      // Obtener hora y minutos en Colombia
      const hours = colombiaTime.getUTCHours();
      const minutes = colombiaTime.getUTCMinutes();
      
      // Convertir a minutos desde medianoche para facilitar la comparación
      const currentMinutes = hours * 60 + minutes;
      
      // Definir el periodo de deshabilitación: 11:25 AM - 11:40 AM
      const disableStartMinutes = 11 * 60 + 25; // 11:25 AM = 685 minutos
      const endOfDayMinutes = 11 * 60 + 40;     // 11:40 AM = 700 minutos
      
      // Verificar si estamos entre las 11:25 AM y las 11:40 AM
      const shouldDisable = currentMinutes >= disableStartMinutes && currentMinutes < endOfDayMinutes;
      
      setIsDisabled(shouldDisable);
    };

    // Verificar inmediatamente al montar
    checkTime();

    // Verificar cada 30 segundos para mantener actualizado el estado
    const interval = setInterval(checkTime, 30000);

    return () => clearInterval(interval);
  }, []);

  return isDisabled;
};
