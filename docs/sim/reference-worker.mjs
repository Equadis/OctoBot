import {prepareLab} from './core/combat-reference-lab.mjs';
import {prepareRotationLab} from './core/combat-rotation-lab.mjs';
import {runReferenceScenario} from './core/combat-reference-adapter.mjs';
self.onmessage=({data})=>{try{const {prepared,seed,iterations}=(data.mode==='rotation'?prepareRotationLab:prepareLab)(data);const result=runReferenceScenario(prepared,{seed,iterations});self.postMessage({ok:true,result});}catch(error){self.postMessage({ok:false,error:error.message});}};
