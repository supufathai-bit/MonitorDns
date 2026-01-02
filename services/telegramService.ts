import { Domain, ISP, Status } from '../types';

export const sendTelegramAlert = async (
  botToken: string,
  chatId: string,
  domain: Domain,
  failedISPs: ISP[]
): Promise<boolean> => {
  if (!botToken || !chatId) return false;

  // แสดงเฉพาะ AIS, True, DTAC พร้อม emoji
  // ใช้ key ตรงๆ เพื่อดึง result จาก domain.results (เช่น 'AIS', 'True', 'DTAC')
  const ispDisplayOrder = ['AIS', 'True', 'DTAC'];

  const ispStatusList = ispDisplayOrder.map(ispKey => {
    const result = domain.results[ispKey as keyof typeof domain.results];
    const status = result?.status || Status.PENDING;

    if (status === Status.BLOCKED) {
      return `🚫 ${ispKey}`;
    } else if (status === Status.ACTIVE) {
      return `✅ ${ispKey}`;
    } else {
      return `⏳ ${ispKey}`;
    }
  }).join('\n');

  const message = `
🚨 <b>DOMAIN ALERT</b> 🚨

<b>Domain:</b> ${domain.hostname}
<b>Status:</b> BLOCKED / UNREACHABLE
<b>Detected on:</b>
${ispStatusList}

<i>Please check the dashboard for more details.</i>
`;

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
    console.error('Failed to send Telegram alert', error);
    return false;
  }
};