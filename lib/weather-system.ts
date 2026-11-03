import * as THREE from "three";

export type WeatherType = 'sunny' | 'overcast' | 'rainy';

export type WeatherSystem = {
  update: (dt: number) => void;
  getWeather: () => WeatherType;
};

export function createWeatherSystem(scene: THREE.Scene): WeatherSystem {
  let currentWeather: WeatherType = 'sunny';
  let nextWeather: WeatherType = 'sunny';
  let timeUntilChange = 30; // seconds
  
  // Scene environment references
  const ambientLight = scene.children.find(child => child instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
  
  function applyWeather(weather: WeatherType) {
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      switch (weather) {
        case 'sunny':
          scene.fog.color.set(0x87CEEB);
          scene.background = new THREE.Color(0x87CEEB);
          scene.backgroundIntensity = 0.8;
          if (ambientLight) {
            ambientLight.color.set(0x38bdf8);
            ambientLight.groundColor.set(0x1e1b18);
            ambientLight.intensity = 1.0;
          }
          break;
        case 'overcast':
          scene.fog.color.set(0x94a3b8);
          scene.background = new THREE.Color(0x94a3b8);
          scene.backgroundIntensity = 0.4;
          if (ambientLight) {
            ambientLight.color.set(0x94a3b8);
            ambientLight.groundColor.set(0x475569);
            ambientLight.intensity = 0.6;
          }
          break;
        case 'rainy':
          scene.fog.color.set(0x475569);
          scene.background = new THREE.Color(0x475569);
          scene.backgroundIntensity = 0.2;
          if (ambientLight) {
            ambientLight.color.set(0x64748b);
            ambientLight.groundColor.set(0x1e293b);
            ambientLight.intensity = 0.4;
          }
          break;
      }
    }
  }

  function update(dt: number) {
    timeUntilChange -= dt;
    if (timeUntilChange <= 0) {
      const types: WeatherType[] = ['sunny', 'overcast', 'rainy'];
      nextWeather = types[Math.floor(Math.random() * types.length)];
      currentWeather = nextWeather;
      applyWeather(currentWeather);
      timeUntilChange = 30 + Math.random() * 60; // 30-90s cycle
    }
  }

  return { update, getWeather: () => currentWeather };
}
