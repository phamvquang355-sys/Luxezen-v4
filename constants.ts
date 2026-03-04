
import { OptionItem, ViewOption } from './types';

export const WEDDING_CATEGORIES: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI tự phân tích ảnh để xác định hạng mục (Sân khấu, Cổng chào, v.v.)' },
  { value: 'Wedding Main Stage', label: 'Sân Khấu Chính', description: 'Màn hình LED, phông nền hoa, bục phát biểu' },
  { value: 'Wedding Entrance Gate', label: 'Cổng Chào', description: 'Cấu trúc chào mừng, vòm hoa' },
  { value: 'Wedding Photobooth', label: 'Backdrop', description: 'Phông nền theo chủ đề cho khách chụp ảnh' },
  { value: 'Wedding Ceremony Aisle', label: 'Lối Đi Lễ Đường', description: 'Đường dẫn, trụ hoa, hiệu ứng phản chiếu' },
  { value: 'Wedding Gallery Table', label: 'Bàn Lễ Tân', description: 'Vật phẩm trang trí, khung ảnh, hoa tươi' },
  { value: 'Guest Table Setup', label: 'Bàn Tiệc Khách', description: 'Trang trí trung tâm, bộ dao dĩa, bố cục' },
];

export const WEDDING_STYLES: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI dựa trên kiến trúc sảnh tiệc để chọn phong cách thẩm mỹ nhất' },
  { value: 'Dreamy Floral', label: 'Mộng Mơ & Hoa Lá', description: 'Hoa lá phong phú, mềm mại, lãng mạn, cảm giác khu vườn' },
  { value: 'Royal Luxury', label: 'Hoàng Gia & Sang Trọng', description: 'Điểm nhấn vàng, đèn chùm, nhung, quy mô lớn' },
  { value: 'Rustic Vintage', label: 'Mộc Mạc & Cổ Điển', description: 'Chất liệu gỗ, ánh sáng ấm, hoa khô, ấm cúng' },
  { value: 'Celestial Galaxy', label: 'Thiên Hà Huyền Ảo', description: 'Bầu trời sao, tông xanh đậm, ánh sáng lung linh, huyền ảo' },
  { value: 'Indochine', label: 'Phong Cách Đông Dương', description: 'Họa tiết truyền thống, mây tre đan, cây xanh nhiệt đới, thanh lịch' },
  { value: 'Minimalist Elegant', label: 'Tối Giản & Tinh Tế', description: 'Đường nét gọn gàng, không gian trắng, tinh tế' },
];

export const COLOR_PALETTES: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'Để AI tự phối màu hài hòa với ánh sáng bối cảnh' },
  { value: 'White & Greenery', label: 'Trắng & Xanh Lá (Vĩnh cửu)' },
  { value: 'Gold & White', label: 'Vàng & Trắng (Sang trọng cổ điển)' },
  { value: 'Pastel Pink & Blue', label: 'Hồng Pastel & Xanh Lam (Mềm mại lãng mạn)' },
  { value: 'Burgundy & Gold', label: 'Đỏ Burgundy & Vàng (Sâu lắng & Đam mê)' },
  { value: 'Deep Navy & Silver', label: 'Xanh Navy Đậm & Bạc (Hiện đại & Thanh lịch)' },
  { value: 'Lavender & Grey', label: 'Tím Lavender & Xám (Mộng mơ)' },
];

export const SURFACE_MATERIALS: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI chọn vật liệu sàn/tường phù hợp với phong cách tổng thể' },
  { value: 'Polished white marble flooring', label: 'Sàn Đá Cẩm Thạch Trắng Bóng', description: 'Bề mặt phản chiếu, sang trọng' },
  { value: 'High-gloss mirror flooring', label: 'Sàn Gương Đen Bóng Cao Cấp', description: 'Tạo hiệu ứng không gian rộng và phản chiếu' },
  { value: 'Dark wooden stage', label: 'Sân Khấu Gỗ Tối Màu', description: 'Mang lại vẻ ấm cúng, cổ điển' },
  { value: 'Rough concrete walls', label: 'Tường Bê Tông Thô', description: 'Phong cách công nghiệp, hiện đại' },
  { value: 'White stucco walls', label: 'Tường Vữa Trắng', description: 'Tối giản, tinh tế' },
];

export const TEXTILE_MATERIALS: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI sẽ lựa chọn vật liệu vải phù hợp với phong cách và hạng mục.' },
  { value: 'Shimmering white silk draping', label: 'Lụa Óng Ánh', description: 'Vải lụa mềm mại, có độ bóng tự nhiên, tạo cảm giác sang trọng.' },
  { value: 'Heavy velvet upholstery', label: 'Nhung Dày Cao Cấp', description: 'Vải nhung dày, tạo vẻ ấm cúng, cổ điển và xa hoa.' },
  { value: 'Sheer chiffon curtains', label: 'Voan Mỏng Bay Bổng', description: 'Vải voan mỏng, nhẹ nhàng, tạo hiệu ứng mềm mại, lãng mạn.' },
  { value: 'Linen table runners', label: 'Vải Linen Tự Nhiên', description: 'Chất liệu linen mộc mạc, phù hợp với phong cách vintage hoặc rustic.' },
  { value: 'Crystal beaded curtains', label: 'Rèm Hạt Pha Lê', description: 'Rèm trang trí bằng các chuỗi hạt pha lê, tạo hiệu ứng lấp lánh và sang trọng.' },
];

export const TEXTILE_COLORS: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI sẽ chọn màu sắc hài hòa với bảng màu tổng thể.' },
  { value: 'White', label: 'Trắng tinh khôi' },
  { value: 'Ivory', label: 'Trắng ngà (Ivory)' },
  { value: 'Gold', label: 'Vàng đồng' },
  { value: 'Rose Gold', label: 'Vàng hồng' },
  { value: 'Silver', label: 'Bạc' },
  { value: 'Champagne', label: 'Vàng Champagne' },
  { value: 'Blush Pink', label: 'Hồng phấn (Blush Pink)' },
  { value: 'Light Blue', label: 'Xanh lam nhạt' },
  { value: 'Sage Green', label: 'Xanh lá cây nhạt (Sage Green)' },
  { value: 'Burgundy', label: 'Đỏ Burgundy' },
  { value: 'Navy Blue', label: 'Xanh Navy' },
];

export const SKETCH_STYLES: OptionItem[] = [
  { value: 'none', label: 'Tự động nhận diện', description: 'Tự động phân tích ảnh là vẽ chì, 3D thô hay ảnh chụp thật' },
  { value: 'pencil', label: 'Bút Chì (Cổ điển)', description: 'Nét vẽ chì than đen trắng, chi tiết' },
  { value: 'architectural', label: 'Kiến trúc (Line Art)', description: 'Nét mảnh, chính xác, phong cách kỹ thuật' },
  { value: 'charcoal', label: 'Than Củi (Nghệ thuật)', description: 'Đậm đà, tương phản cao, phóng khoáng' },
  { value: 'watercolor', label: 'Màu Nước (Sáng tạo)', description: 'Màu sắc nhẹ nhàng, loang màu nghệ thuật' },
];

export const SAMPLE_IMAGE_URL = "https://picsum.photos/800/600";

// --- Cấu hình Tham số Nhiếp ảnh ---
export const PHOTOGRAPHY_PRESETS = {
  CINEMATIC: {
    label: "Cinematic (Sâu & Nghệ thuật)",
    prompt: "shot on 35mm lens, f/2.8, cinematic lighting, volumetric fog, high dynamic range",
    description: "Phù hợp cho toàn cảnh sân khấu"
  },
  MACRO_DETAIL: {
    label: "Macro Detail (Cận cảnh chi tiết)",
    prompt: "shot on 85mm prime lens, f/1.8, creamy bokeh, extreme close-up, sharp textures",
    description: "Phù hợp cho hoa cầm tay, nhẫn, hoặc chi tiết bàn gallery"
  },
  NATURAL_LIGHT: {
    label: "Outdoor Natural (Ánh sáng tự nhiên)",
    prompt: "golden hour lighting, soft shadows, airy atmosphere, f/4.0",
    description: "Phù hợp cho tiệc cưới ngoài trời"
  }
};

// Ràng buộc quan trọng để giữ nguyên bố cục
export const STRUCTURE_FIDELITY_PROMPT = 
  "STRICTLY MAINTAIN the original layout, object positions, and camera angle. DO NOT add, move, or remove any structural elements. Focus ONLY on enhancing textures, materials, and realistic lighting.";

export const REALISM_MODIFIERS = 
  "photorealistic, 8k resolution, ray-tracing, unreal engine 5 style, highly detailed silk and floral textures, professional color grading, shot on Sony A7R IV";

export const VIEW_ANGLES: ViewOption[] = [
  {
    id: 'eye-level',
    label: 'Ngang tầm mắt (Eye-Level)',
    description: 'Góc nhìn thực tế của khách mời.',
    // Prompt giữ nguyên môi trường, chỉ thay đổi góc máy
    prompt_suffix: "eye-level perspective taken at 1.6m height. STRICTLY MAINTAIN existing walls, windows, and floor materials. Do not change the room structure.",
    guidance: "high"
  },
  {
    id: 'top-down',
    label: 'Mặt bằng - Bóc trần (Top-Down)',
    description: 'Nhìn từ trên cao, loại bỏ trần để thấy bố trí.',
    // Prompt đặc biệt để "bóc trần"
    prompt_suffix: "direct top-down orthographic view, architectural floor plan style. CEILING REMOVED to show the interior layout. Cutaway view looking inside the room from above. Clear furniture arrangement. Flat lighting.",
    guidance: "medium" // Giảm guidance để AI dám "xóa" trần nhà
  },
  {
    id: 'aisle-view',
    label: 'Dọc lối đi (Aisle View)',
    description: 'Góc nhìn từ cuối đường dẫn lên sân khấu.',
    prompt_suffix: "symmetrical low-angle shot from the aisle center. Focus on the pathway leading to the stage. Preserve the hall's architecture/columns.",
    guidance: "high"
  },
  {
    id: 'bird-eye',
    label: 'Góc chim bay (Bird-eye)',
    description: 'Góc nhìn 3/4 từ trên cao bao quát.',
    prompt_suffix: "isometric bird's eye view, high angle 45 degrees. Volumetric lighting. Show the entire event space context.",
    guidance: "high"
  },
  {
    id: 'front-stage',
    label: 'Chính diện Sân khấu (Front Stage)',
    description: 'Góc nhìn trực diện không điểm tụ để kiểm tra tỷ lệ chi tiết backdrop.',
    prompt_suffix: "straight direct front elevation view of the main stage backdrop, completely symmetrical, flat orthographic-like perspective, highly detailed decoration focus, no camera distortion."
  },
  {
    id: 'ceiling-focus',
    label: 'Góc ngước trần (Ceiling Focus)',
    description: 'Góc máy hơi ngước lên để khoe trọn vẹn hoa thả trần và đèn chùm.',
    prompt_suffix: "low angle shot looking slightly up, emphasizing elaborate ceiling decorations, hanging floral installations, luxurious chandeliers, grand atmosphere, majestic scale."
  },
  {
    id: 'welcome-area',
    label: 'Khu vực đón khách (Welcome Area)',
    description: 'Tập trung vào cổng hoa và bàn Gallery ngay lối vào.',
    prompt_suffix: "entrance perspective view, focusing on the welcome area, floral arch gate, reception gallery table in the foreground, blurred event hall in the background, inviting atmosphere."
  },
  {
    id: 'centerpiece-detail',
    label: 'Cận cảnh Bàn tiệc (Detail/Macro)',
    description: 'Góc chụp xóa phông tập trung vào chi tiết hoa, nến và setup bàn ăn.',
    prompt_suffix: "macro photography, close-up shot of a lavish table centerpiece, detailed floral arrangements, elegant tableware, crystal glasses, lit candles, beautiful bokeh background, shallow depth of field."
  }
];
