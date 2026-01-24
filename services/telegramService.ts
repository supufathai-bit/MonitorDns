import { Domain, ISP, Status } from '../types';

// ส่งแจ้งเตือนแบบตารางรวมทุกโดเมน
export const sendTelegramAlertTable = async (
  botToken: string,
  chatId: string,
  domains: Domain[]
): Promise<boolean> => {
  if (!botToken || !chatId || domains.length === 0) return false;

  // Helper function to get status emoji (✅ = ACTIVE, ⛔ = BLOCKED)
  const getStatusEmoji = (status: Status | undefined): string => {
    if (!status) return '⏳';
    if (status === Status.BLOCKED) return '⛔';
    if (status === Status.ACTIVE) return '✅';
    return '❓';
  };

  // สร้างตารางแบบ monospace ใน pre block (มี copy button ใน Telegram)
  let table = '<pre>\n';
  table += 'Domain               | A   | T   | D\n';
  table += '---------------------+-----+-----+-----\n';

  for (const domain of domains) {
    const aisStatus = domain.results[ISP.AIS]?.status;
    const trueStatus = domain.results[ISP.TRUE]?.status || domain.results[ISP.DTAC]?.status;
    const dtacStatus = domain.results[ISP.DTAC]?.status || domain.results[ISP.TRUE]?.status;

    const aisEmoji = getStatusEmoji(aisStatus);
    const trueEmoji = getStatusEmoji(trueStatus);
    const dtacEmoji = getStatusEmoji(dtacStatus);

    // จำกัดความยาว hostname ให้ไม่เกิน 21 ตัวอักษร
    const displayHostname = domain.hostname.length > 21
      ? domain.hostname.substring(0, 18) + '...'
      : domain.hostname;

    table += displayHostname.padEnd(21) + `| ${aisEmoji}  | ${trueEmoji}  | ${dtacEmoji}\n`;
  }

  table += '</pre>';

  const message = `🚨 <b>สถานะเว็บไซต์</b>\n\n${table}\n\n<i>A = AIS, T = True, D = DTAC</i>`;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Failed to send Telegram alert table', error);
    return false;
  }
};

// ฟังก์ชันเก่าสำหรับส่งแยกแต่ละโดเมน (ไม่ใช้แล้ว - เก็บไว้สำหรับ backward compatibility)
export const sendTelegramAlert = async (
  botToken: string,
  chatId: string,
  domain: Domain,
  failedISPs: ISP[]
): Promise<boolean> => {
  // เรียกใช้ sendTelegramAlertTable แทน โดยส่งโดเมนเดียว
  return sendTelegramAlertTable(botToken, chatId, [domain]);
};