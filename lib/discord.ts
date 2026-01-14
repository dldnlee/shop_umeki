
interface DiscordMessageProps {
  message: string;
}

export const sendDiscordMessage = async ({message} : DiscordMessageProps) => {
    if (!message) return;
    const webhookURL = "https://discord.com/api/webhooks/1451039916115890279/Qrp7TZ1lFVZWszP3c5L3_61Y7XYLnELCEQ2UiSeTRogWIDquH-sSSm5LAOyHWQQAA8qm"

    try {
      await fetch(webhookURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message, // The main message content
          // You can also add 'embeds', 'avatar_url', etc.
        }),
      });
    } catch (error) {
      console.error('Error sending webhook:', error);
    }
};

