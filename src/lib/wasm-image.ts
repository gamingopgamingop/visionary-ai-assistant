/**
 * WASM-powered image processing using @silvia-odwyer/photon.
 * All operations run client-side at near-native speed.
 */

let photonModule: typeof import("@silvia-odwyer/photon") | null = null;

async function getPhoton() {
  if (!photonModule) {
    photonModule = await import("@silvia-odwyer/photon");
  }
  return photonModule;
}

function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function base64ToPhotonImage(base64: string) {
  const photon = await getPhoton();
  return new Promise<InstanceType<typeof photon.PhotonImage>>(
    (resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = imageToCanvas(img);
        const ctx = canvas.getContext("2d")!;
        resolve(photon.open_image(canvas, ctx));
      };
      img.onerror = reject;
      img.src = base64;
    }
  );
}

function photonImageToBase64(
  photon: typeof import("@silvia-odwyer/photon"),
  pImg: InstanceType<typeof photon.PhotonImage>
): string {
  const canvas = document.createElement("canvas");
  canvas.width = pImg.get_width();
  canvas.height = pImg.get_height();
  const ctx = canvas.getContext("2d")!;
  photon.putImageData(canvas, ctx, pImg);
  return canvas.toDataURL("image/png");
}

export type WasmEffect =
  | "grayscale"
  | "blur"
  | "sharpen"
  | "brighten"
  | "contrast"
  | "sepia"
  | "invert"
  | "flipH"
  | "flipV"
  | "solarize"
  | "emboss";

export async function applyWasmEffect(
  base64: string,
  effect: WasmEffect
): Promise<string> {
  const photon = await getPhoton();
  const pImg = await base64ToPhotonImage(base64);

  switch (effect) {
    case "grayscale":
      photon.grayscale(pImg);
      break;
    case "blur":
      photon.gaussian_blur(pImg, 3);
      break;
    case "sharpen":
      photon.sharpen(pImg);
      break;
    case "brighten":
      photon.alter_channel(pImg, 0, 40);
      break;
    case "contrast":
      photon.adjust_contrast(pImg, 30.0);
      break;
    case "sepia":
      photon.sepia(pImg);
      break;
    case "invert":
      photon.invert(pImg);
      break;
    case "flipH":
      photon.fliph(pImg);
      break;
    case "flipV":
      photon.flipv(pImg);
      break;
    case "solarize":
      photon.solarize(pImg);
      break;
    case "emboss":
      photon.emboss(pImg);
      break;
  }

  const result = photonImageToBase64(photon, pImg);
  pImg.free();
  return result;
}

export async function isWasmSupported(): Promise<boolean> {
  try {
    await getPhoton();
    return true;
  } catch {
    return false;
  }
}
