import * as dat from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import firefliesVertexShader from './shader/fireflies/fireflies.vs'
import firefliesFragmentShader from './shader/fireflies/fireflies.fs'
import portalVertexShader from './shader/portal/portal.vs'
import portalFragmentShader from './shader/portal/portal.fs'
import { DeviceChecker } from './utilities/deviceChecker';
import { gsap } from "gsap";

let scene, camera, renderer, clock;
let gltfScene;
let video = document.getElementById('video');
let gui = null;
let guiWidth = 400;
const deviceChecker = new DeviceChecker();
if(deviceChecker.isMobile){
  guiWidth = 350;
}

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

const mouse = new THREE.Vector2();

const debugObject = {
  clearColor: '#151519',
  portalOuterColor: '#720ced',
  portalInnerColor: '#160a29',
  portalAdditiveSpeed: 0.00,
};

// load everything first?



const init = () => 
{
  gui = new dat.GUI({
    width: guiWidth,
  })
  
  // Canvas
  const canvas = document.querySelector('canvas.webgl')
  canvas.style.display = 'block';
  scene = new THREE.Scene()
  const textureLoader = new THREE.TextureLoader();
  const bakedTexture = textureLoader.load('portalBakedTexture.jpg')
  // NEED THIS CAUSE THREEJS IS OPPOSITE
  bakedTexture.flipY = false;
  bakedTexture.colorSpace = THREE.SRGBColorSpace;
  // Materials
  const bakedMaterial = new THREE.MeshBasicMaterial({
    map: bakedTexture,
  });

  const lampMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffe5
  })

  const portalLightMaterial = new THREE.ShaderMaterial(
  {
    uniforms: {
      uTime: { value: 0 },
      uColorOuter: {value: new THREE.Color('#7714f0')},
      uColorInner: {value: new THREE.Color('#160a29')},
      uFinalOuterColor: { value: new THREE.Color('#17ee74') },
      uFinalInnerColor: { value: new THREE.Color('#20642c') },
      uTransitionStrength: { value: 0},
      uWarpSpeed: { value: 0.0}
    },
    vertexShader: portalVertexShader,
    fragmentShader: portalFragmentShader,
    side: THREE.DoubleSide
  })

    // Draco loader
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('draco/')
  // GLTF loader
  const gltfLoader = new GLTFLoader()
  gltfLoader.setDRACOLoader(dracoLoader)
  gltfLoader.load(
    // 'portal.glb',
    'mergedPortal.glb',
    (gltf) => 
    {
      const bakedMesh = gltf.scene.children.find(child => child.name === 'Cube056') // Should change to Baked name in blender tbh.
      bakedMesh.material = bakedMaterial;
      // or you can use, this is probably faster and more readible
      const lamp1Mesh = gltf.scene.children.find(child => child.name === 'Cube011');
      const lamp2Mesh = gltf.scene.children.find(child => child.name === 'Cube014');
      const portalMesh = gltf.scene.children.find(child => child.name === 'Circle');
      
      lamp1Mesh.material = lampMaterial;
      lamp2Mesh.material = lampMaterial;
      portalMesh.material = portalLightMaterial;
      
      gltfScene = gltf.scene;
      scene.add(gltf.scene);
    }
  )
  // Fire Flies
  const firefliesGeometry = new THREE.BufferGeometry();
  const firefliesCount = 100;
  const positionArray = new Float32Array(firefliesCount * 3);
  const scaleArray = new Float32Array(firefliesCount);

  for(let i = 0; i < firefliesCount; i++)
  {
    const i3 = i * 3;
    positionArray[i3 + 0] = (Math.random() - 0.5) * 4; // X
    positionArray[i3 + 1] = Math.random() * 1.5; // Y ?
    positionArray[i3 + 2] = (Math.random() - 0.5) * 4; // Z

    scaleArray[i] = Math.random() ;
  }
  firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
  firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1));

  // fire flies material
  const firefliesMaterial = new THREE.ShaderMaterial({
    // size: 0.1,
    // sizeAttenuation: true,
    uniforms: {
      uPixelRatio: {value: Math.min(window.devicePixelRatio, 2)},
      uSize: {value: 100},
      uTime: {value: 0}
    },
    vertexShader: firefliesVertexShader,
    fragmentShader: firefliesFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false, // false so particles can be behind without hiding
  })
  const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial);
  scene.add(fireflies);
  
  /**
 * Overlay
 */
const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
  // wireframe: true,
  transparent: true,
  uniforms:
  {
      uAlpha: { value: 0 }
  },
    vertexShader: `
      void main()
      {
          gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uAlpha;

      void main()
      {
          gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
      }
  `
  })
  const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
  scene.add(overlay)

  const setupEventListeners = () => {
    window.addEventListener('resize', () =>
    {
      // Update sizes
      sizes.width = window.innerWidth
      sizes.height = window.innerHeight

      // Update camera
      camera.aspect = sizes.width / sizes.height
      camera.updateProjectionMatrix()

      // Update renderer
      renderer.setSize(sizes.width, sizes.height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      // Update anythign that uses screen 
      firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    })
    window.addEventListener('mousemove', (_event) => {
      mouse.x = _event.clientX / sizes.width * 2 - 1; // divide to get 0 -> 1, * by 2 to get 0 - > 2, then -1 to shift left 1
      mouse.y = - (_event.clientY / sizes.height * 2 - 1);
    })
  }

  setupEventListeners();

  /**
   * Camera
   */
  // Base camera
  
  camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
  camera.position.x = 2.3
  camera.position.y = 2.6
  camera.position.z = 4
  scene.add(camera)

  let currentCamera = camera;

  const transitionCamera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
  
  // create an object for the sound to play from
  const boxGeometry = new THREE.BoxGeometry(1,1,1);
  const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
  const mesh = new THREE.Mesh( boxGeometry, material );
  mesh.scale.set(1.4,1.4,.2);
  mesh.position.set(0., .8, -1.8);
  mesh.visible = false;
  scene.add( mesh );

  // Ray casting
  const raycasterTargetObject = mesh;
  const raycaster = new THREE.Raycaster();

  // Portal Audio 
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const ambientSound = new THREE.PositionalAudio( listener );
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(
      'audio/portal.aac',
      (buffer) => {
        ambientSound.setBuffer(buffer);
        ambientSound.setRefDistance(1.5);
        ambientSound.loop = true;
        ambientSound.setVolume(0.5);
        mesh.add(ambientSound);
        ambientSound.play();
      }
  )
  
  const enterSound = new THREE.PositionalAudio( listener );
  audioLoader.load(
      'audio/PortalEnter.aac',
      (buffer) => {
          enterSound.setBuffer(buffer);
          enterSound.setRefDistance(1.5);
          enterSound.loop = false;
          enterSound.setVolume(0.45);
          mesh.add(enterSound);
      }
  )
  
  // Sounds
  const handleTransition = () => {
    controls.enableDamping = false;     // Prevent past damping from being applied to new position and update
    controls.update();
    camera.position.set(0.08747708758627344,  0.44209001524914743, 2.839451149344242);  // Then apply new fixed* position
    controls.update();
    controls.enabled = false; // disable orbit controls to prevent bug of passing the video plane and making it invisible
    window.removeEventListener('pointerdown', handlePointer); // Remove so it cannot trigger another interaction
    ambientSound.stop();
    enterSound.play();
    // Portal Colour change effect
    tween = gsap.to(portalLightMaterial.uniforms.uTransitionStrength, {duration: 2.5, value: 1, ease: 'power1.out'} );
    mesh.position.y += 0.1;
    controls.target = mesh.position;

    // debugObject.portalAdditiveSpeed
    gsap.to(debugObject, {
      portalAdditiveSpeed: 1,
      duration: 6,
      ease: 'power1.out',
      overwrite: 'auto'
    })
    // Zoom
    gsap.to(controls, {
      maxDistance: .60,
      duration: 2.0,
      ease: 'power1.inout',
      overwrite: 'auto',
      onComplete: () => {
        // controls.enabled = false;
      }
    })
    // Fade into black using overlay
    gsap.to(overlayMaterial.uniforms.uAlpha, {duration: 4.3, value: 1, ease: 'power1.in', overwrite: 'auto'});
    gui.hide();
    
    // Fade out from black using videoMaterial and play video
    window.setTimeout(() => {
      // overlayMaterial.uniforms.uAlpha = 1;
      currentCamera = transitionCamera;
      scene.remove(camera);
      scene.remove(gltfScene);
      scene.remove(mesh);
      scene.remove(fireflies);
      videoMaterial.uniforms.uOpacity.value = 1.0;
      video.play();
      scene.remove(overlay);
    }, 5000  )
  }

  const handlePointer = (_event ) => {
    mouse.x = _event.clientX / sizes.width * 2 - 1;
    mouse.y = - (_event.clientY / sizes.height * 2 - 1);

    raycaster.setFromCamera(mouse, camera);
    const intersect = raycaster.intersectObject(raycasterTargetObject);
    if(intersect.length && gui._closed)
    {
        handleTransition();
    }
    else if(_event.target.className === 'webgl')
    {
      gui.close();
    }
  }

  window.addEventListener('pointerdown', handlePointer)

  // Controls
const controls = new OrbitControls(camera, canvas)
controls.maxDistance = 10;
controls.enableDamping = true
controls.saveState();
  /**
   * Renderer
   */
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(debugObject.clearColor);

  const debugObjectInit = () => {
    // Scene properties
    gui.addColor(debugObject, 'clearColor').name('Background Color').onChange(() => {
      renderer.setClearColor(debugObject.clearColor);
    });
    // Portal
    const portalFolder = gui.addFolder('Portal Folder');
    portalFolder.addColor(debugObject, 'portalOuterColor').name("Portal Outer Color")
        .onChange(() => {
            portalLightMaterial.uniforms.uColorOuter.value.set(debugObject.portalOuterColor);
        })
    portalFolder.addColor(debugObject, 'portalInnerColor') .name("Portal Inner Color")
    .onChange(() => {
        portalLightMaterial.uniforms.uColorInner.value.set( debugObject.portalInnerColor);
    })
    // Fire Flies 
    const firefliesFolder = gui.addFolder('Fire Flies')
    firefliesFolder.add(firefliesMaterial.uniforms.uSize, 'value').min(0).max(500.0).step(1).name('FIreflies size')

    gui.add(debugObject, 'portalAdditiveSpeed').min(0.0).max(1.0).step(0.001).name('Warp Speed');
    // gui.close();
  }
  debugObjectInit();
  /**
 * Animate
 */
  clock = new THREE.Clock()
  let prevTime = 0;
  let tween = null;
  debugObject.isTransitioning = false;
  gui.add(debugObject, 'isTransitioning').onChange(() => {
    if(debugObject.isTransitioning)
    {
      videoMaterial.uniforms.uOpacity.value = 1.0;
      tween = gsap.to(portalLightMaterial.uniforms.uTransitionStrength, {duration: 2, value: 1} );
      portalLightMaterial.uniforms.uTransitionStrength.value = 1;
      controls.target = mesh.position;
      gsap.to(controls, {
        maxDistance: .5,
        duration: 1.5,
        overwrite: 'auto',
      })
      controls.update();
    }
    else
    {
      if(tween != null)
      {
        tween.kill();
      }
      portalLightMaterial.uniforms.uTransitionStrength.value = 0;
      controls.reset();
    }
  });

  
  video.volume = 0.5;
  const videoTexture = new THREE.VideoTexture( video );
  const videoMaterial = new THREE.ShaderMaterial(
      {
          uniforms: {
              uVideoTexture: { value: videoTexture},
              uOpacity: {value: 0.0}
          },
          vertexShader: 
          `
              varying vec2 vUv;
              void main() {
                  gl_Position = vec4(position, 1.0);
                  vUv = uv;
              }
          `,
          fragmentShader: 
          `
              uniform sampler2D uVideoTexture;
              uniform float uOpacity;
              varying vec2 vUv;
              void main() {
                  vec4 finalColor = texture2D(uVideoTexture, vUv);
                  gl_FragColor = vec4(vec3(finalColor.xyz), uOpacity);
              }
          `,
          transparent: true,
      });
  videoMaterial.render
  const videoGeometry = new THREE.PlaneGeometry(2,2);
  const videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
  scene.add(videoMesh);

  const tick = () =>
  {
    const elapsedTime = clock.getElapsedTime() // Time in seconds
    const deltaTime = elapsedTime - prevTime; // Change in time between current time and last frame time
    prevTime = deltaTime;

    firefliesMaterial.uniforms.uTime.value = elapsedTime;
    portalLightMaterial.uniforms.uTime.value = elapsedTime;
    portalLightMaterial.uniforms.uWarpSpeed.value = debugObject.portalAdditiveSpeed;
    // console.log(camera.position);
    // Update controls
    controls.update()
    // 
// Vector3 {x: 0.08747708758627344, y: 0.44209001524914743, z: 2.839451149344242}
    // Render
    renderer.render(scene, currentCamera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
  }

  tick()
}

// init();
const startButton = document.getElementById('startButton');
startButton.addEventListener( 'click', () => {
  console.log('Starting experience');
  init(); 
  startButton.style.display = 'none';
}) 
