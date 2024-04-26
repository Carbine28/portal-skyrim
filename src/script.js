import * as dat from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import firefliesVertexShader from './shader/fireflies/fireflies.vs'
import firefliesFragmentShader from './shader/fireflies/fireflies.fs'
import portalVertexShader from './shader/portal/portal.vs'
import portalFragmentShader from './shader/portal/portal.fs'

import { gsap } from "gsap";

/**
 * Base
 */
// Debug
const gui = new dat.GUI({
    width: 400
})
const debugObject = {
    clearColor: '#151519',
    portalOuterColor: '#720ced',
    portalInnerColor: '#160a29',
};

gui.addColor(debugObject, 'clearColor').onChange(() => {
    renderer.setClearColor(debugObject.clearColor);
});

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

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
        },
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        side: THREE.DoubleSide
    }
)
const portalFolder = gui.addFolder('Portal Folder');
portalFolder.addColor(debugObject, 'portalOuterColor')
    .onChange(() => {
        portalLightMaterial.uniforms.uColorOuter.value.set(debugObject.portalOuterColor);
    })
portalFolder.addColor(debugObject, 'portalInnerColor')
.onChange(() => {
    portalLightMaterial.uniforms.uColorInner.value.set( debugObject.portalInnerColor);
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
        // Old method, not efficient since we will only have one child after blender optimisaiton using JOINS ctrl + J
        // gltf.scene.traverse(child => {
        //     // if(child.name === 'Cube011' || child.name === 'Cube014' || child.name === 'Circle')
        //     // {
        //     //     child.material = lampMaterial;
        //     //     return;
        //     // }
        //     // else
        //     // {
        //     child.material = bakedMaterial;
        //     // }
        // })
        const bakedMesh = gltf.scene.children.find(child => child.name === 'Cube056') // Should change to Baked name in blender tbh.
        bakedMesh.material = bakedMaterial;
        // or you can use, this is probably faster and more readible
        const lamp1Mesh = gltf.scene.children.find(child => child.name === 'Cube011');
        const lamp2Mesh = gltf.scene.children.find(child => child.name === 'Cube014');
        const portalMesh = gltf.scene.children.find(child => child.name === 'Circle');

        lamp1Mesh.material = lampMaterial;
        lamp2Mesh.material = lampMaterial;
        portalMesh.material = portalLightMaterial;

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

const firefliesFolder = gui.addFolder('Fire Flies')
firefliesFolder.add(firefliesMaterial.uniforms.uSize, 'value').min(0).max(500.0).step(1).name('FIreflies size')


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

const raycaster = new THREE.Raycaster();

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

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

const mouse = new THREE.Vector2();
window.addEventListener('mousemove', (_event) => {
    mouse.x = _event.clientX / sizes.width * 2 - 1; // divide to get 0 -> 1, * by 2 to get 0 - > 2, then -1 to shift left 1
    mouse.y = - (_event.clientY / sizes.height * 2 - 1);
})


let currentIntersectTarget = null;
window.addEventListener('click', () => {
    if(currentIntersectTarget)
    {
        handleTransition();
    }
})


/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 2.3
camera.position.y = 2.6
camera.position.z = 4
scene.add(camera)

// Portal Audio 
const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.PositionalAudio( listener );
const audioLoader = new THREE.AudioLoader();
audioLoader.load(
    'audio/portal.ogg',
    (buffer) => {
        sound.setBuffer(buffer);
        sound.setRefDistance(1.5);
        sound.loop = true;
        sound.setVolume(0.1);
        sound.play();
    }
)

// create an object for the sound to play from
const boxGeometry = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
const mesh = new THREE.Mesh( boxGeometry, material );
mesh.scale.set(1.4,1.4,.2);
mesh.position.set(0., .8, -1.8);
mesh.visible = false;
scene.add( mesh );
mesh.add(sound);

const enterSound = new THREE.PositionalAudio( listener );
audioLoader.load(
    'audio/PortalEnter.ogg',
    (buffer) => {
        enterSound.setBuffer(buffer);
        enterSound.setRefDistance(1.5);
        sound.loop = false;
        enterSound.setVolume(0.1);
    }
)

const video = document.getElementById('video');
video.volume = 0.2;

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
const videoGeometry = new THREE.PlaneGeometry(2,2, 1, 1);
const videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
scene.add(videoMesh);


const handleTransition = () => {
    sound.stop();
    enterSound.volume = 0.2;
    enterSound.play();
    // Fade into black using overlay
    gsap.to(overlayMaterial.uniforms.uAlpha, {duration: 3.5, value: 1});
    // window.setTimeout(() => {
        
    // })
    // Fade out from black using videoMaterial and play video
    window.setTimeout(() => {
        videoMaterial.uniforms.uOpacity.value = 1.0;
        scene.remove(overlay);
        video.play();
    }, 5000  )
}


// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(debugObject.clearColor);
/**
 * Animate
 */
const clock = new THREE.Clock()
const raycasterTargetObject = mesh;

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    raycaster.setFromCamera(mouse, camera);
    
    const intersect = raycaster.intersectObject(raycasterTargetObject)
    if(intersect.length)
    {
        currentIntersectTarget = intersect[0];
    }
    else
    {
        currentIntersectTarget = null;
    }


    firefliesMaterial.uniforms.uTime.value = elapsedTime;
    portalLightMaterial.uniforms.uTime.value = elapsedTime;
    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()