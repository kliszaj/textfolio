import * as T from "three";
import { prepareScenes, sceneForHour } from "./scenes";

// buildWorkstation draws its textures on 2D canvases, which jsdom lacks, so
// these tests stand in a workstation with just the named parts prepareScenes
// drives, starting where the real model puts them.
function fakeWorkstation() {
  const root = new T.Group();
  const add = (name: string, parent: T.Object3D = root, object: T.Object3D = new T.Group()) => {
    object.name = name;
    parent.add(object);
    return object;
  };
  const coffee = add("Coffee mug");
  // The mug's ceramic, shared with the keyboard as the real desk shares its
  // materials between props.
  const shared = new T.MeshStandardMaterial({ color: "#eee8d7" });
  add("Mug body", coffee, new T.Mesh(new T.CylinderGeometry(), shared));
  add("Coffee surface", coffee);
  add("Crema at rim", coffee);
  add("Coffee steam", coffee);
  const keyboard = add("Mechanical keyboard");
  add("Keycaps", keyboard, new T.Mesh(new T.BoxGeometry(), shared));
  add("Workspace mouse");
  add("Colourful macro controller");
  add("Cutting mat • rubber edge");
  add("Cutting mat • grid");
  const boom = add("Microphone and white boom arm");
  add("Desk clamp", boom);
  add("Boom arm", boom);
  add("Herman Miller Aeron • stylized");
  add("Illustrated editor display", root, new T.Mesh(new T.PlaneGeometry(1, 0.4), new T.MeshBasicMaterial()));
  add("Diffuser", root, new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial()));
  const notebook = add("Field Notes notebook");
  notebook.position.set(0.575, 0.778, 0.315);
  notebook.rotation.y = -0.08;
  add("Field Notes back", notebook);
  add("Field Notes leaf", notebook);
  add("Field Notes staples", notebook);
  const pen = add("Desk pen");
  pen.position.set(0.575, 0.7861, 0.315);
  pen.rotation.y = Math.PI / 2 - 0.08;
  return root;
}

const FRAME = 1 / 60;
// The notebook's spots, from prepareScenes.
const WRITING = { x: -0.0355, y: 0.7835, z: 0.26 };
const STOWED = { x: 0.575, y: 0.778, z: 0.315 };

function setup() {
  const root = fakeWorkstation();
  const scenes = prepareScenes(root, { illustratedScreen: false });
  const get = (name: string) => root.getObjectByName(name)!;
  // Runs the scene at `hour` for `seconds`, calling `each` after every frame.
  const run = (hour: number, seconds: number, each?: () => void) => {
    for (let t = 0; t < seconds; t += FRAME) {
      scenes.update(hour, FRAME, false);
      each?.();
    }
  };
  return { scenes, get, run };
}

const near = (object: T.Object3D, spot: { x: number; y: number; z: number }, within = 0.002) =>
  Math.abs(object.position.x - spot.x) < within &&
  Math.abs(object.position.y - spot.y) < within &&
  Math.abs(object.position.z - spot.z) < within;

test("the hours map onto the five scenes", () => {
  expect([2, 8, 12, 15, 20].map(sceneForHour)).toEqual(["sleep", "design", "meeting", "coding", "video"]);
});

describe("the notebook and pen", () => {
  test("in the meeting the notebook comes out, opens, and the pen goes down on the page", () => {
    const { get, run } = setup();
    run(15, 3);
    run(12, 12);
    const notebook = get("Field Notes notebook");
    const leaf = get("Field Notes leaf");
    const pen = get("Desk pen");
    expect(near(notebook, WRITING)).toBe(true);
    expect(leaf.rotation.z).toBeCloseTo(Math.PI, 1);
    expect(get("Field Notes staples").visible).toBe(false);
    // On the open page: just off the notebook's centre, angled across it.
    expect(pen.position.x).toBeCloseTo(notebook.position.x + 0.012, 2);
    expect(pen.position.z).toBeCloseTo(notebook.position.z + 0.008, 2);
  });

  test("the cover only starts to open once the pen is clear of it", () => {
    const { get, run } = setup();
    run(15, 3);
    const notebook = get("Field Notes notebook");
    const leaf = get("Field Notes leaf");
    const pen = get("Desk pen");
    let penOffCoverWhenOpening: number | null = null;
    run(12, 12, () => {
      if (penOffCoverWhenOpening === null && leaf.rotation.z > 0.02) {
        penOffCoverWhenOpening = Math.hypot(pen.position.x - notebook.position.x, pen.position.z - notebook.position.z);
      }
    });
    expect(penOffCoverWhenOpening).not.toBeNull();
    // Set aside 7.5cm off, well clear of a 9cm-wide book's centre line.
    expect(penOffCoverWhenOpening!).toBeGreaterThan(0.06);
  });

  test("after the meeting it shuts before it leaves, and goes back with the pen on top", () => {
    const { get, run } = setup();
    run(12, 12);
    const notebook = get("Field Notes notebook");
    const leaf = get("Field Notes leaf");
    const pen = get("Desk pen");
    let movedWhileOpen = false;
    run(15, 12, () => {
      if (leaf.rotation.z > 0.05 && !near(notebook, WRITING, 0.005)) movedWhileOpen = true;
    });
    expect(movedWhileOpen).toBe(false);
    expect(near(notebook, STOWED)).toBe(true);
    expect(leaf.rotation.z).toBeCloseTo(0, 2);
    expect(get("Field Notes staples").visible).toBe(true);
    expect(pen.position.x).toBeCloseTo(notebook.position.x, 2);
    expect(pen.position.z).toBeCloseTo(notebook.position.z, 2);
  });

  test("outside the meeting it stays closed and stowed", () => {
    const { get, run } = setup();
    for (const hour of [2, 8, 15, 20]) {
      run(hour, 6);
      expect(near(get("Field Notes notebook"), STOWED)).toBe(true);
      expect(get("Field Notes leaf").rotation.z).toBeCloseTo(0, 2);
    }
  });
});

describe("the coffee", () => {
  test("the mug is out in the morning and the meeting; its ring is left behind after", () => {
    const { get, run } = setup();
    const ring = get("Morning coffee ring");
    const expectations: [number, boolean, boolean][] = [
      // hour, mug visible, ring visible
      [8, true, false],
      [12, true, false],
      [15, false, true],
      [20, false, true],
      [2, false, false],
    ];
    for (const [hour, mug, ringShown] of expectations) {
      // Long enough for them to finish coming and going (they animate).
      run(hour, 2);
      expect([hour, get("Coffee mug").visible, ring.visible]).toEqual([hour, mug, ringShown]);
    }
  });

  test("the ring sits where the mug last stood, in the meeting", () => {
    const { get, run } = setup();
    run(12, 8);
    const mug = get("Coffee mug").position;
    const ring = get("Morning coffee ring").position;
    expect(ring.x).toBeCloseTo(mug.x, 2);
    expect(ring.z).toBeCloseTo(mug.z, 2);
  });

  test("the water glass takes over in the afternoon only", () => {
    const { get, run } = setup();
    for (const [hour, shown] of [[8, false], [12, false], [15, true], [20, false]] as const) {
      run(hour, 2);
      expect(get("Afternoon water glass").visible).toBe(shown);
    }
  });

  test("the mug fades out rather than blinking, staying full size", () => {
    const { get, run } = setup();
    run(8, 2);
    const body = get("Mug body") as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
    expect(body.material.opacity).toBeCloseTo(1, 2);
    expect(body.material.transparent).toBe(false);
    run(15, 0.25);
    expect(get("Coffee mug").visible).toBe(true);
    expect(body.material.opacity).toBeGreaterThan(0.1);
    expect(body.material.opacity).toBeLessThan(0.9);
    expect(body.material.transparent).toBe(true);
    expect(get("Coffee mug").scale.x).toBe(1);
    run(15, 2);
    expect(get("Coffee mug").visible).toBe(false);
  });

  test("fading the mug leaves props that shared its material alone", () => {
    const { get, run } = setup();
    run(8, 2);
    run(15, 0.25);
    const keycaps = get("Keycaps") as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
    expect(keycaps.material.opacity).toBe(1);
    expect(keycaps.material.transparent).toBe(false);
  });

  test("steam only shows over a mug that has fully faded in", () => {
    const { get, run } = setup();
    run(15, 2);
    run(8, 0.2);
    expect(get("Coffee steam").visible).toBe(false);
    run(8, 2);
    expect(get("Coffee steam").visible).toBe(true);
  });

  test("the first frame puts everything in place without animating", () => {
    const { get, scenes } = setup();
    scenes.update(15, 1 / 60, false);
    const shell = get("Afternoon water glass").children[0] as T.Mesh<T.BufferGeometry, T.MeshPhysicalMaterial>;
    expect(get("Afternoon water glass").visible).toBe(true);
    expect(shell.material.opacity).toBeCloseTo(0.28, 2);
    expect(get("Coffee mug").visible).toBe(false);
  });

  test("steam only rises from the morning cup", () => {
    const { get, run } = setup();
    for (const [hour, shown] of [[8, true], [12, false], [15, false]] as const) {
      run(hour, 1);
      expect(get("Coffee steam").visible).toBe(shown);
    }
  });
});
