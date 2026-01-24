import { Domain, ISP, Status } from '../types';

export const sendTelegramAlert = async (
  botToken: string,
  chatId: string,
  domain: Domain,
  failedISPs: ISP[]
): Promise<boolean> => {
  if (!botToken || !chatId) return false;

  // แสดงเฉพาะ AIS, True, DTAC พร้อม emoji
  const ispStatusList = [
    { isp: ISP.AIS, name: 'AIS' },
    { isp: ISP.TRUE, name: 'True' },
    { isp: ISP.DTAC, name: 'DTAC' },
  ].map(({ isp, name }) => {
    const result = domain.results[isp];
    const status = result?.status || Status.PENDING;

    if (status === Status.BLOCKED) {
      return `🚫 ${name}`;
    } else if (status === Status.ACTIVE) {
      return `✅ ${name}`;
    } else {
      return `⏳ ${name}`;
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