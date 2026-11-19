window.addEventListener('error', function (e) {
  const el = document.getElementById('error-log');
  if (el) el.textContent = 'エラー: ' + e.message;
});

window.addEventListener('DOMContentLoaded', () => {
  if (typeof THREE === 'undefined') {
    const el = document.getElementById('error-log');
    if (el) el.textContent = 'CRITICAL: Three.js が読み込まれていません！three.min.jsを確認してください。';
    return;
  }

  const CHARACTERS = window.CHARACTERS || [];
  if (CHARACTERS.length === 0) {
    console.warn('CHARACTERS が空です。characters.js と各キャラの data.js を確認してください。');
  }

  let money = 100;
  let mySlots = [null, null, null, null, null, null];
  let lockTimer = 0;
  let equippedSlot = 1;
  let incomeMultiplier = 1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 20, 90);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshLambertMaterial({ color: 0x4ade80 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const conveyor = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.4, 50),
    new THREE.MeshLambertMaterial({ color: 0x334155 })
  );
  conveyor.position.set(0, 0.2, 0);
  scene.add(conveyor);

  // 自分の基地
  const myBaseGroup = new THREE.Group();
  myBaseGroup.position.set(-14, 0, 0);
  scene.add(myBaseGroup);

  const baseFloor = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.3, 18),
    new THREE.MeshLambertMaterial({ color: 0x1e293b })
  );
  baseFloor.position.y = 0.15;
  myBaseGroup.add(baseFloor);

  const lockButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 1.5, 16),
    new THREE.MeshLambertMaterial({ color: 0xef4444 })
  );
  lockButton.position.set(5, 0.8, 7);
  myBaseGroup.add(lockButton);

  const barrierMesh = new THREE.Mesh(
    new THREE.BoxGeometry(12.2, 5, 18.2),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 })
  );
  barrierMesh.position.y = 2.5;
  barrierMesh.visible = false;
  myBaseGroup.add(barrierMesh);

  const pedestalMeshes = [];
  const pedestalPositions = [];
  for (let i = 0; i < 6; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const px = -2.5 + col * 5;
    const pz = -5 + row * 5;
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.4, 16),
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    ped.position.set(px, 0.4, pz);
    myBaseGroup.add(ped);
    pedestalMeshes.push(ped);
    pedestalPositions.push(new THREE.Vector3(px, 0.4, pz));
  }

  const player = {
    x: -10, y: 1.8, z: 0,
    vy: 0,
    yaw: -Math.PI / 2,
    pitch: 0,
    onGround: true
  };

  function selectSlot(num) {
    equippedSlot = num;
    document.querySelectorAll('.slot').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.slot) === num);
    });
  }

  document.querySelectorAll('.slot').forEach((el) => {
    el.addEventListener('click', () => {
      selectSlot(Number(el.dataset.slot));
    });
  });

  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Digit1') selectSlot(1);
    if (e.code === 'Digit2') selectSlot(2);
    if (e.code === 'Digit3') selectSlot(3);
    if (e.code === 'KeyE') handleInteract();
    if (e.code === 'KeyQ') handleSell();
    if (e.code === 'KeyR') handleReversal();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  function createFallbackMesh(charData) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.8, 1.4),
      new THREE.MeshLambertMaterial({ color: charData.color || 0xffffff })
    );
    mesh.position.y = 1.2;
    return mesh;
  }

  function createCharacterDisplay(charData) {
    const group = new THREE.Group();
    const fallback = createFallbackMesh(charData);
    group.add(fallback);

    if (charData.image) {
      const img = new Image();
      img.onload = () => {
        try {
          group.remove(fallback);
          const texture = new THREE.Texture(img);
          texture.needsUpdate = true;
          const mat = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(mat);
          sprite.scale.set(2.0, 2.6, 1);
          sprite.position.y = 1.4;
          group.add(sprite);
        } catch (err) {
          console.error('テクスチャ反映エラー:', charData.image, err);
          const el = document.getElementById('error-log');
          if (el) el.textContent = 'テクスチャ反映エラー: ' + err.message;
        }
      };
      img.onerror = (err) => {
        console.error('画像読み込みエラー:', charData.image, err);
        const el = document.getElementById('error-log');
        if (el) el.textContent = '画像読込失敗: ' + charData.image;
      };
      img.src = charData.image;
    }

    return group;
  }

  function createLabelSprite(text, subtext) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(10, 10, 492, 140);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 65);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(subtext, 256, 115);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4.5, 1.4, 1);
    return sprite;
  }

  const conveyorItems = [];
  let spawnTimer = 0;

  function spawnConveyorItem() {
    if (!CHARACTERS || CHARACTERS.length === 0) return;
    const idx = Math.floor(Math.random() * CHARACTERS.length);
    const data = CHARACTERS[idx];
    const group = new THREE.Group();

    const charDisplay = createCharacterDisplay(data);
    group.add(charDisplay);

    const label = createLabelSprite(`${data.name} [${data.rarity}]`, `$${data.cost} | +$${data.income}/s`);
    label.position.y = 3.0;
    group.add(label);

    group.position.set(0, 0.2, -23);
    scene.add(group);
    conveyorItems.push({ group, charDisplay, data });
  }

  const placedMeshes = [null, null, null, null, null, null];

  function placeCharacterInBase(slotIndex, charData) {
    mySlots[slotIndex] = charData;
    if (placedMeshes[slotIndex]) {
      myBaseGroup.remove(placedMeshes[slotIndex]);
    }
    const ped = pedestalMeshes[slotIndex];
    const group = new THREE.Group();

    const charDisplay = createCharacterDisplay(charData);
    group.add(charDisplay);

    const label = createLabelSprite(charData.name, `+$${charData.income}/s`);
    label.position.y = 3.0;
    group.add(label);

    group.position.copy(ped.position);
    myBaseGroup.add(group);
    placedMeshes[slotIndex] = group;
  }

  let currentTarget = null;

  function handleInteract() {
    if (!currentTarget) return;
    if (currentTarget.type === 'lock') {
      if (lockTimer <= 0) {
        lockTimer = 30;
        barrierMesh.visible = true;
      }
    } else if (currentTarget.type === 'buy') {
      const item = currentTarget.item;
      const emptySlot = mySlots.findIndex(s => s === null);
      if (emptySlot === -1) {
        alert("基地のスロットがいっぱいです！");
        return;
      }
      if (money >= item.data.cost) {
        money -= item.data.cost;
        placeCharacterInBase(emptySlot, item.data);
        scene.remove(item.group);
        const idx = conveyorItems.indexOf(item);
        if (idx > -1) conveyorItems.splice(idx, 1);
      }
    }
  }

  function handleSell() {
    let closestSlot = -1;
    let minDist = 999;
    const playerPos = new THREE.Vector3(player.x, player.y, player.z);

    for (let i = 0; i < 6; i++) {
      if (mySlots[i] !== null) {
        const worldPedPos = pedestalPositions[i].clone().add(myBaseGroup.position);
        const dist = playerPos.distanceTo(worldPedPos);
        if (dist < minDist && dist < 3.0) {
          minDist = dist;
          closestSlot = i;
        }
      }
    }

    if (closestSlot !== -1) {
      const soldChar = mySlots[closestSlot];
      const refund = Math.floor(soldChar.cost / 2);
      money += refund;
      mySlots[closestSlot] = null;
      if (placedMeshes[closestSlot]) {
        myBaseGroup.remove(placedMeshes[closestSlot]);
        placedMeshes[closestSlot] = null;
      }
    }
  }

  function handleReversal() {
    const counts = {};
    mySlots.forEach(s => {
      if (s !== null) {
        counts[s.name] = (counts[s.name] || 0) + 1;
      }
    });

    let targetCharName = null;
    for (const name in counts) {
      if (counts[name] >= 2) {
        targetCharName = name;
        break;
      }
    }

    if (!targetCharName) return;

    let removedCount = 0;
    for (let i = 0; i < 6; i++) {
      if (mySlots[i] !== null && mySlots[i].name === targetCharName && removedCount < 2) {
        mySlots[i] = null;
        if (placedMeshes[i]) {
          myBaseGroup.remove(placedMeshes[i]);
          placedMeshes[i] = null;
        }
        removedCount++;
      }
    }

    incomeMultiplier += 1;
    alert(`🎉 リバース成功！ ${targetCharName} を捧げて、収益倍率が x${incomeMultiplier} にアップしました！`);
  }

  setInterval(() => {
    let totalIncome = 0;
    mySlots.forEach(s => { if (s) totalIncome += s.income; });
    totalIncome *= incomeMultiplier;
    money += totalIncome;
    document.getElementById('moneyDisplay').textContent = `$${money.toLocaleString()}`;
    document.getElementById('incomeDisplay').textContent = `収益: $${totalIncome.toLocaleString()} / 秒 (倍率: x${incomeMultiplier})`;
  }, 1000);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    const rotSpeed = 2.0 * dt;
    if (keys['ArrowLeft']) player.yaw += rotSpeed;
    if (keys['ArrowRight']) player.yaw -= rotSpeed;
    if (keys['ArrowUp']) player.pitch = Math.min(Math.PI / 3, player.pitch + rotSpeed * 0.7);
    if (keys['ArrowDown']) player.pitch = Math.max(-Math.PI / 3, player.pitch - rotSpeed * 0.7);

    let moveSpeed = 10 * dt;
    if (equippedSlot === 2) moveSpeed *= 1.6;
    if (equippedSlot === 3) moveSpeed *= 2.3;

    const forwardX = -Math.sin(player.yaw);
    const forwardZ = -Math.cos(player.yaw);
    const rightX = Math.cos(player.yaw);
    const rightZ = -Math.sin(player.yaw);

    if (keys['KeyW']) { player.x += forwardX * moveSpeed; player.z += forwardZ * moveSpeed; }
    if (keys['KeyS']) { player.x -= forwardX * moveSpeed; player.z -= forwardZ * moveSpeed; }
    if (keys['KeyD']) { player.x += rightX * moveSpeed; player.z += rightZ * moveSpeed; }
    if (keys['KeyA']) { player.x -= rightX * moveSpeed; player.z -= rightZ * moveSpeed; }

    if (keys['Space'] && player.onGround) {
      player.vy = 11;
      player.onGround = false;
    }
    player.y += player.vy * dt;
    if (player.y > 1.8) {
      player.vy -= 28 * dt;
    } else {
      player.y = 1.8;
      player.vy = 0;
      player.onGround = true;
    }

    camera.position.set(player.x, player.y, player.z);
    const lookTarget = new THREE.Vector3(
      player.x - Math.sin(player.yaw) * Math.cos(player.pitch),
      player.y + Math.sin(player.pitch),
      player.z - Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    camera.lookAt(lookTarget);

    spawnTimer += dt;
    if (spawnTimer >= 2.8) {
      spawnTimer = 0;
      spawnConveyorItem();
    }

    for (let i = conveyorItems.length - 1; i >= 0; i--) {
      const item = conveyorItems[i];
      item.group.position.z += 4.5 * dt;
      if (item.charDisplay) item.charDisplay.rotation.y += 1.2 * dt;
      if (item.group.position.z > 24) {
        scene.remove(item.group);
        conveyorItems.splice(i, 1);
      }
    }

    const lockEl = document.getElementById('lockDisplay');
    if (lockTimer > 0) {
      lockTimer -= dt;
      lockEl.textContent = `基地バリア: 作動中 (残り ${Math.ceil(lockTimer)}秒・再ロック不可)`;
      lockEl.style.color = '#38bdf8';
      if (lockTimer <= 0) barrierMesh.visible = false;
    } else {
      lockEl.textContent = `基地バリア: 解除中 (ロック可能！)`;
      lockEl.style.color = '#f472b6';
    }

    currentTarget = null;
    const promptEl = document.getElementById('prompt');

    const lockWorldPos = new THREE.Vector3();
    lockButton.getWorldPosition(lockWorldPos);
    if (camera.position.distanceTo(lockWorldPos) < 4.0) {
      if (lockTimer <= 0) {
        currentTarget = { type: 'lock' };
        promptEl.textContent = '[E] 基地をロックする (30秒バリア)';
        promptEl.style.display = 'block';
      } else {
        promptEl.textContent = 'バリア作動中のためロックできません';
        promptEl.style.display = 'block';
      }
    }

    if (!currentTarget) {
      for (const item of conveyorItems) {
        if (camera.position.distanceTo(item.group.position) < 5.0) {
          currentTarget = { type: 'buy', item };
          promptEl.textContent = `[E] ${item.data.name} を買う ($${item.data.cost.toLocaleString()})`;
          promptEl.style.display = 'block';
          break;
        }
      }
    }

    if (!currentTarget) {
      promptEl.style.display = 'none';
    }

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
});