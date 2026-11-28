// Reference PPM: probability per eligible landed event, not guaranteed procs/minute.
export function ppmChance(ppm,baseSpeedSeconds){if(!Number.isFinite(ppm)||ppm<0||!Number.isFinite(baseSpeedSeconds)||baseSpeedSeconds<=0)throw Error('Explicit PPM and positive base weapon speed required');return Math.min(1,ppm*baseSpeedSeconds/60);}
