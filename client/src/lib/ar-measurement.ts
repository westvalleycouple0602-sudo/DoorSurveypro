import * as THREE from 'three';

export interface MeasurementPoint {
  position: THREE.Vector3;
  timestamp: number;
}

export interface ARMeasurement {
  distance: number;
  unit: 'inches' | 'feet' | 'meters';
  points: MeasurementPoint[];
}

export interface ARCapabilities {
  supported: boolean;
  hasHitTest: boolean;
  hasDepthSensing: boolean;
  message: string;
}

export interface DeviceCapabilities {
  hasLiDAR: boolean;
  hasDepthSensing: boolean;
  hasNeuralEngine: boolean;
  estimatedPointDensity: number;
  deviceType: 'ipad-pro-lidar' | 'ipad-pro' | 'iphone-pro-lidar' | 'android-arcore' | 'generic' | 'unsupported';
  depthDataUsage: 'cpu-optimized' | 'gpu-optimized' | 'none';
  depthDataFormat: 'luminance-alpha' | 'float32' | 'none';
  maxFrameRate: number;
}

export interface DepthSensingConfig {
  usagePreference: 'cpu-optimized' | 'gpu-optimized';
  dataFormatPreference: 'luminance-alpha' | 'float32';
}

export interface DepthInfo {
  width: number;
  height: number;
  rawValueToMeters: number;
  data: Float32Array | Uint16Array | null;
  timestamp: number;
}

const IPAD_PRO_LIDAR_MODELS = [
  'iPad13,4', 'iPad13,5', 'iPad13,6', 'iPad13,7',
  'iPad13,8', 'iPad13,9', 'iPad13,10', 'iPad13,11',
  'iPad14,3', 'iPad14,4', 'iPad14,5', 'iPad14,6',
  'iPad16,3', 'iPad16,4', 'iPad16,5', 'iPad16,6',
];

const IPHONE_PRO_LIDAR_MODELS = [
  'iPhone13,3', 'iPhone13,4',
  'iPhone14,3', 'iPhone14,2',
  'iPhone15,3', 'iPhone15,2',
  'iPhone16,2', 'iPhone16,1',
  'iPhone17,1', 'iPhone17,2', 'iPhone17,3', 'iPhone17,4',
];

function detectAppleDevice(): { isApple: boolean; modelHint: string } {
  const ua = navigator.userAgent;
  const isApple = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  let modelHint = 'unknown';
  
  if (isApple) {
    if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      const screenWidth = window.screen.width * (window.devicePixelRatio || 1);
      const screenHeight = window.screen.height * (window.devicePixelRatio || 1);
      
      if (screenWidth >= 2732 || screenHeight >= 2732) {
        modelHint = 'ipad-pro-12.9';
      } else if (screenWidth >= 2388 || screenHeight >= 2388) {
        modelHint = 'ipad-pro-11';
      } else {
        modelHint = 'ipad';
      }
    } else if (/iPhone/.test(ua)) {
      modelHint = 'iphone';
    }
  }
  
  return { isApple, modelHint };
}

function hasM4NeuralEngine(): boolean {
  const { isApple, modelHint } = detectAppleDevice();
  if (!isApple) return false;
  
  if (modelHint.includes('ipad-pro')) {
    const screenWidth = window.screen.width * (window.devicePixelRatio || 1);
    if (screenWidth >= 2732) {
      return true;
    }
  }
  
  return false;
}

export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const defaultCapabilities: DeviceCapabilities = {
    hasLiDAR: false,
    hasDepthSensing: false,
    hasNeuralEngine: false,
    estimatedPointDensity: 10000,
    deviceType: 'unsupported',
    depthDataUsage: 'none',
    depthDataFormat: 'none',
    maxFrameRate: 30,
  };

  if (!navigator.xr) {
    return defaultCapabilities;
  }

  try {
    const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!arSupported) {
      return defaultCapabilities;
    }

    const { isApple, modelHint } = detectAppleDevice();
    
    let hasDepthSensing = false;
    try {
      const testSession = await navigator.xr.requestSession('immersive-ar', {
        optionalFeatures: ['depth-sensing'],
      });
      
      if (testSession) {
        hasDepthSensing = true;
        await testSession.end();
      }
    } catch (e) {
      hasDepthSensing = false;
    }

    const hasNeuralEngine = hasM4NeuralEngine();
    
    if (isApple && modelHint.includes('ipad-pro')) {
      const hasLiDAR = hasDepthSensing || modelHint.includes('ipad-pro');
      
      return {
        hasLiDAR,
        hasDepthSensing,
        hasNeuralEngine,
        estimatedPointDensity: hasLiDAR ? 500000 : 50000,
        deviceType: hasLiDAR ? 'ipad-pro-lidar' : 'ipad-pro',
        depthDataUsage: hasLiDAR ? 'cpu-optimized' : 'none',
        depthDataFormat: hasLiDAR ? 'float32' : 'none',
        maxFrameRate: hasNeuralEngine ? 60 : 30,
      };
    }

    if (isApple && modelHint === 'iphone') {
      return {
        hasLiDAR: hasDepthSensing,
        hasDepthSensing,
        hasNeuralEngine: false,
        estimatedPointDensity: hasDepthSensing ? 250000 : 25000,
        deviceType: hasDepthSensing ? 'iphone-pro-lidar' : 'generic',
        depthDataUsage: hasDepthSensing ? 'cpu-optimized' : 'none',
        depthDataFormat: hasDepthSensing ? 'float32' : 'none',
        maxFrameRate: 60,
      };
    }

    if (/Android/i.test(navigator.userAgent)) {
      return {
        hasLiDAR: false,
        hasDepthSensing,
        hasNeuralEngine: false,
        estimatedPointDensity: hasDepthSensing ? 100000 : 20000,
        deviceType: 'android-arcore',
        depthDataUsage: hasDepthSensing ? 'gpu-optimized' : 'none',
        depthDataFormat: hasDepthSensing ? 'luminance-alpha' : 'none',
        maxFrameRate: 30,
      };
    }

    return {
      hasLiDAR: false,
      hasDepthSensing,
      hasNeuralEngine: false,
      estimatedPointDensity: 10000,
      deviceType: 'generic',
      depthDataUsage: 'none',
      depthDataFormat: 'none',
      maxFrameRate: 30,
    };
  } catch (error) {
    console.error('Error detecting device capabilities:', error);
    return defaultCapabilities;
  }
}

export async function checkARSupport(): Promise<ARCapabilities> {
  if (!navigator.xr) {
    return {
      supported: false,
      hasHitTest: false,
      hasDepthSensing: false,
      message: 'WebXR is not supported in this browser. Please use Chrome or Edge on Android.',
    };
  }

  try {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    
    if (!supported) {
      return {
        supported: false,
        hasHitTest: false,
        hasDepthSensing: false,
        message: 'AR is not supported on this device. AR requires Chrome on Android with ARCore support.',
      };
    }

    const capabilities = await detectDeviceCapabilities();

    return {
      supported: true,
      hasHitTest: true,
      hasDepthSensing: capabilities.hasDepthSensing,
      message: capabilities.hasLiDAR 
        ? 'AR measurement with LiDAR is supported on this device.'
        : 'AR measurement is supported on this device.',
    };
  } catch (error) {
    return {
      supported: false,
      hasHitTest: false,
      hasDepthSensing: false,
      message: 'Failed to check AR support. Please ensure you are using a compatible browser.',
    };
  }
}

export async function startARSession(
  onSessionStart: (session: XRSession) => void,
  onSessionEnd: () => void
): Promise<void> {
  if (!navigator.xr) {
    throw new Error('WebXR not supported');
  }

  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'],
  });

  session.addEventListener('end', onSessionEnd);
  onSessionStart(session);
}

export async function startEnhancedARSession(
  onSessionStart: (session: XRSession) => void,
  onSessionEnd: () => void,
  depthConfig?: DepthSensingConfig
): Promise<XRSession> {
  if (!navigator.xr) {
    throw new Error('WebXR not supported');
  }

  const capabilities = await detectDeviceCapabilities();
  
  const requiredFeatures: string[] = ['hit-test'];
  const optionalFeatures: string[] = [];
  
  if (capabilities.hasDepthSensing) {
    optionalFeatures.push('depth-sensing');
  }

  const sessionInit: XRSessionInit = {
    requiredFeatures,
    optionalFeatures,
  };

  if (capabilities.hasDepthSensing && depthConfig) {
    (sessionInit as any).depthSensing = {
      usagePreference: [depthConfig.usagePreference],
      dataFormatPreference: [depthConfig.dataFormatPreference],
    };
  } else if (capabilities.hasDepthSensing) {
    (sessionInit as any).depthSensing = {
      usagePreference: [capabilities.depthDataUsage !== 'none' ? capabilities.depthDataUsage : 'cpu-optimized'],
      dataFormatPreference: [capabilities.depthDataFormat !== 'none' ? capabilities.depthDataFormat : 'float32'],
    };
  }

  const session = await navigator.xr.requestSession('immersive-ar', sessionInit);

  session.addEventListener('end', onSessionEnd);
  onSessionStart(session);
  
  return session;
}

export function calculateDistance(
  point1: THREE.Vector3,
  point2: THREE.Vector3,
  unit: 'inches' | 'feet' | 'meters' = 'inches'
): number {
  const distanceMeters = point1.distanceTo(point2);
  
  switch (unit) {
    case 'inches':
      return distanceMeters * 39.3701;
    case 'feet':
      return distanceMeters * 3.28084;
    case 'meters':
    default:
      return distanceMeters;
  }
}

export function formatMeasurement(
  distance: number,
  unit: 'inches' | 'feet' | 'meters' = 'inches'
): string {
  const rounded = Math.round(distance * 10) / 10;
  
  switch (unit) {
    case 'inches':
      return `${rounded}"`;
    case 'feet':
      return `${rounded}'`;
    case 'meters':
      return `${rounded}m`;
    default:
      return `${rounded}`;
  }
}

export class ARMeasurementSession {
  private session: XRSession | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private points: MeasurementPoint[] = [];
  private hitTestSource: XRHitTestSource | null = null;
  private reticle: THREE.Mesh | null = null;
  
  private depthInfo: DepthInfo | null = null;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private depthTexture: THREE.DataTexture | null = null;
  private referenceSpace: XRReferenceSpace | null = null;

  private onDepthDataCallback: ((depthInfo: DepthInfo) => void) | null = null;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    const capabilities = await checkARSupport();
    if (!capabilities.supported) {
      throw new Error(capabilities.message);
    }

    this.deviceCapabilities = await detectDeviceCapabilities();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      preserveDrawingBuffer: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    this.createReticle();
  }

  private createReticle(): void {
    if (!this.scene) return;

    const geometry = new THREE.RingGeometry(0.03, 0.04, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });
    
    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  async start(): Promise<void> {
    if (!this.renderer || !this.renderer.xr) {
      throw new Error('AR session not initialized');
    }

    const depthConfig: DepthSensingConfig | undefined = this.deviceCapabilities?.hasDepthSensing
      ? {
          usagePreference: this.deviceCapabilities.depthDataUsage !== 'none' 
            ? this.deviceCapabilities.depthDataUsage 
            : 'cpu-optimized',
          dataFormatPreference: this.deviceCapabilities.depthDataFormat !== 'none'
            ? this.deviceCapabilities.depthDataFormat
            : 'float32',
        }
      : undefined;

    const requiredFeatures: string[] = ['hit-test'];
    const optionalFeatures: string[] = [];
    
    if (this.deviceCapabilities?.hasDepthSensing) {
      optionalFeatures.push('depth-sensing');
    }

    const sessionInit: XRSessionInit = {
      requiredFeatures,
      optionalFeatures,
    };

    if (depthConfig) {
      (sessionInit as any).depthSensing = {
        usagePreference: [depthConfig.usagePreference],
        dataFormatPreference: [depthConfig.dataFormatPreference],
      };
    }

    this.session = await navigator.xr!.requestSession('immersive-ar', sessionInit);

    this.session.addEventListener('end', () => this.end());
    
    await this.renderer.xr.setSession(this.session);

    const viewerSpace = await this.session.requestReferenceSpace('viewer');
    this.referenceSpace = await this.session.requestReferenceSpace('local');
    
    if (this.session.requestHitTestSource) {
      const hitTestSource = await this.session.requestHitTestSource({ space: viewerSpace });
      this.hitTestSource = hitTestSource || null;
    }

    this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
  }

  private render(time: number, frame?: XRFrame): void {
    if (!frame || !this.session || !this.scene || !this.camera || !this.renderer) return;

    const referenceSpace = this.renderer.xr.getReferenceSpace();
    const pose = frame.getViewerPose(referenceSpace!);

    if (pose && this.hitTestSource && this.reticle) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const hitPose = hit.getPose(referenceSpace!);
        
        if (hitPose) {
          this.reticle.visible = true;
          this.reticle.matrix.fromArray(hitPose.transform.matrix);
        }
      } else {
        this.reticle.visible = false;
      }
    }

    if (pose && this.deviceCapabilities?.hasDepthSensing) {
      this.processDepthData(frame, pose);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private processDepthData(frame: XRFrame, pose: XRViewerPose): void {
    if (!this.session) return;

    try {
      const views = pose.views;
      if (views.length === 0) return;

      const view = views[0];
      
      const depthData = (frame as any).getDepthInformation?.(view);
      
      if (depthData) {
        const depthInfo: DepthInfo = {
          width: depthData.width || 256,
          height: depthData.height || 192,
          rawValueToMeters: depthData.rawValueToMeters || 0.001,
          data: depthData.data || null,
          timestamp: Date.now(),
        };

        this.depthInfo = depthInfo;
        
        if (this.onDepthDataCallback) {
          this.onDepthDataCallback(depthInfo);
        }
      }
    } catch (e) {
    }
  }

  setOnDepthDataCallback(callback: (depthInfo: DepthInfo) => void): void {
    this.onDepthDataCallback = callback;
  }

  getDepthInfo(): DepthInfo | null {
    return this.depthInfo;
  }

  getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities;
  }

  placePoint(): MeasurementPoint | null {
    if (!this.reticle || !this.reticle.visible) {
      return null;
    }

    const position = new THREE.Vector3();
    position.setFromMatrixPosition(this.reticle.matrix);

    const point: MeasurementPoint = {
      position,
      timestamp: Date.now(),
    };

    this.points.push(point);

    if (this.scene) {
      const geometry = new THREE.SphereGeometry(0.02, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(position);
      this.scene.add(marker);

      if (this.points.length >= 2) {
        const line = this.createLine(
          this.points[this.points.length - 2].position,
          this.points[this.points.length - 1].position
        );
        this.scene.add(line);
      }
    }

    return point;
  }

  private createLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    return new THREE.Line(geometry, material);
  }

  getMeasurement(unit: 'inches' | 'feet' | 'meters' = 'inches'): ARMeasurement | null {
    if (this.points.length < 2) {
      return null;
    }

    const distance = calculateDistance(
      this.points[0].position,
      this.points[this.points.length - 1].position,
      unit
    );

    return {
      distance,
      unit,
      points: this.points,
    };
  }

  clearPoints(): void {
    this.points = [];
    
    if (this.scene) {
      const objectsToRemove = this.scene.children.filter(
        (child) => child !== this.reticle
      );
      objectsToRemove.forEach((obj) => this.scene!.remove(obj));
    }
  }

  end(): void {
    if (this.session) {
      this.session.end();
      this.session = null;
    }

    if (this.hitTestSource) {
      this.hitTestSource.cancel();
      this.hitTestSource = null;
    }

    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
    }

    this.points = [];
    this.depthInfo = null;
    this.referenceSpace = null;
  }

  dispose(): void {
    this.end();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.depthTexture) {
      this.depthTexture.dispose();
      this.depthTexture = null;
    }

    this.scene = null;
    this.camera = null;
    this.reticle = null;
    this.deviceCapabilities = null;
    this.onDepthDataCallback = null;
  }
}
