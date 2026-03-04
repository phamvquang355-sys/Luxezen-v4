export interface VideoShotOption {
  id: string;
  label: string;
  description: string;
  promptInstruction: string;
  icon: string; // Changed from JSX.Element | string to string to avoid React import in constants if not needed, or I can keep it if I use emojis as strings. The user code uses emojis strings in the array.
}

export const WEDDING_CAMERA_SHOTS: VideoShotOption[] = [
  {
    id: 'aisle-walk',
    label: 'Bước vào Lễ đường',
    description: 'Máy quay tiến chậm theo đường dẫn lên sân khấu (Dolly-in).',
    promptInstruction: 'Slow cinematic dolly-in camera movement. Eye-level perspective walking down the wedding aisle towards the main stage. Smooth, elegant motion, romantic atmosphere, glittering lights.',
    icon: '🚶‍♀️'
  },
  {
    id: 'centerpiece-orbit',
    label: 'Xoay vòng Chi tiết',
    description: 'Máy quay xoay chậm quanh bàn gallery hoặc hoa trang trí, xóa phông lấp lánh.',
    promptInstruction: 'Smooth slow-motion orbit camera shot circling around the lavish centerpiece. Macro detail, shallow depth of field, beautiful bokeh background from fairy lights, luxurious cinematic feel.',
    icon: '🔄'
  },
  {
    id: 'grand-reveal',
    label: 'Ngước nhìn Lộng lẫy',
    description: 'Từ dưới ngước lên để khoe độ tráng lệ của đèn chùm và trần nhà.',
    promptInstruction: 'Dramatic cinematic tilt-up camera movement. Starting from the decorated tables and slowly tilting up to reveal the massive crystal chandeliers and spectacular ceiling floral installations. Grand scale.',
    icon: '⬆️'
  },
  {
    id: 'immersive-pan',
    label: 'Quét toàn cảnh (Pan)',
    description: 'Quét máy ngang thật chậm để khoe không gian rộng lớn của sảnh tiệc.',
    promptInstruction: 'Slow, smooth cinematic panning camera from left to right. Wide angle shot showcasing the vast scale of the wedding reception hall, beautifully set tables, and ambient lighting.',
    icon: '↔️'
  },
  {
    id: 'magical-focus',
    label: 'Hiệu ứng Lung linh',
    description: 'Máy quay tĩnh nhưng hiệu ứng ánh nến, sương mù và pha lê chuyển động.',
    promptInstruction: 'Static camera but dynamic atmosphere. Flickering candlelight, sparkling crystals, soft smoke/haze on the floor, dynamic bokeh lights shimmering in the background. Dreamy and magical wedding vibe.',
    icon: '✨'
  }
];
