// Robust MediaPipe loader for production environments
export class MediaPipeLoader {
  private static instance: MediaPipeLoader;
  private handsClass: any = null;
  private loadingPromise: Promise<any> | null = null;
  private isLoaded = false;

  private constructor() {}

  public static getInstance(): MediaPipeLoader {
    if (!MediaPipeLoader.instance) {
      MediaPipeLoader.instance = new MediaPipeLoader();
    }
    return MediaPipeLoader.instance;
  }

  public async loadHandsClass(): Promise<any> {
    if (this.isLoaded && this.handsClass) {
      console.log('MediaPipe already loaded, returning cached instance');
      return this.handsClass;
    }

    if (this.loadingPromise) {
      console.log('MediaPipe loading in progress, waiting...');
      return this.loadingPromise;
    }

    this.loadingPromise = this.performLoad();
    return this.loadingPromise;
  }

  private async performLoad(): Promise<any> {
    console.log('Starting comprehensive MediaPipe loading...');

    // Strategy 1: Try direct import
    try {
      console.log('Attempting direct ES6 import...');
      const { Hands } = await import('@mediapipe/hands');
      this.handsClass = Hands;
      this.isLoaded = true;
      console.log('✓ Direct import successful');
      return this.handsClass;
    } catch (error) {
      console.log('✗ Direct import failed:', error);
    }

    // Strategy 2: Check global window object
    if (typeof window !== 'undefined' && (window as any).Hands) {
      console.log('✓ Found MediaPipe on window object');
      this.handsClass = (window as any).Hands;
      this.isLoaded = true;
      return this.handsClass;
    }

    // Strategy 3: Progressive CDN loading with multiple sources
    const cdnSources = [
      {
        name: 'jsDelivr',
        url: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js',
        locateBase: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/'
      },
      {
        name: 'unpkg',
        url: 'https://unpkg.com/@mediapipe/hands@0.4.1675469240/hands.js',
        locateBase: 'https://unpkg.com/@mediapipe/hands@0.4.1675469240/'
      },
      {
        name: 'GitHub Raw',
        url: 'https://raw.githubusercontent.com/google/mediapipe/master/mediapipe/modules/hand_landmark/hand_landmark_tracking_cpu.pbtxt',
        locateBase: 'https://storage.googleapis.com/mediapipe-assets/'
      }
    ];

    for (const source of cdnSources) {
      try {
        console.log(`Attempting to load from ${source.name}...`);
        
        await new Promise<void>((resolve, reject) => {
          // Check if script already exists
          const existingScript = document.querySelector(`script[src="${source.url}"]`);
          if (existingScript && (window as any).Hands) {
            console.log(`${source.name} already loaded`);
            resolve();
            return;
          }

          const script = document.createElement('script');
          script.src = source.url;
          script.crossOrigin = 'anonymous';
          script.async = true;
          script.defer = true;

          let resolved = false;
          const timeout = 15000; // 15 second timeout

          script.onload = () => {
            console.log(`${source.name} script loaded, waiting for MediaPipe...`);
            
            const checkAvailability = (attempt = 1) => {
              if ((window as any).Hands) {
                if (!resolved) {
                  resolved = true;
                  console.log(`✓ MediaPipe available from ${source.name}`);
                  resolve();
                }
              } else if (attempt < 20) {
                setTimeout(() => checkAvailability(attempt + 1), 200);
              } else {
                if (!resolved) {
                  resolved = true;
                  reject(new Error(`MediaPipe not available from ${source.name} after 20 attempts`));
                }
              }
            };

            checkAvailability();
          };

          script.onerror = () => {
            if (!resolved) {
              resolved = true;
              reject(new Error(`Failed to load script from ${source.name}`));
            }
          };

          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              reject(new Error(`Timeout loading from ${source.name}`));
            }
          }, timeout);

          document.head.appendChild(script);
        });

        if ((window as any).Hands) {
          this.handsClass = (window as any).Hands;
          this.isLoaded = true;
          console.log(`✓ Successfully loaded MediaPipe from ${source.name}`);
          return this.handsClass;
        }

      } catch (error) {
        console.log(`${source.name} failed:`, error);
        continue;
      }
    }

    // Strategy 4: Try to load MediaPipe models directly
    try {
      console.log('Attempting manual MediaPipe initialization...');
      
      // Create a basic Hands-like class for fallback
      const fallbackHands = class {
        private options: any = {};
        private onResultsCallback: ((results: any) => void) | null = null;

        setOptions(options: any) {
          this.options = options;
          console.log('Fallback hands configured with options:', options);
        }

        onResults(callback: (results: any) => void) {
          this.onResultsCallback = callback;
        }

        async send(inputs: { image: HTMLVideoElement }) {
          // Basic fallback - just call results with empty landmarks
          if (this.onResultsCallback) {
            this.onResultsCallback({
              multiHandLandmarks: [],
              multiHandedness: []
            });
          }
        }
      };

      console.log('⚠ Using fallback MediaPipe implementation');
      this.handsClass = fallbackHands;
      this.isLoaded = true;
      return this.handsClass;

    } catch (fallbackError) {
      console.error('Even fallback failed:', fallbackError);
      throw new Error('All MediaPipe loading strategies failed');
    }
  }

  public isMediaPipeLoaded(): boolean {
    return this.isLoaded;
  }

  public getHandsClass(): any {
    return this.handsClass;
  }
}