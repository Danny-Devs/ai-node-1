import { OpenAI } from 'openai';
import { encoding_for_model } from 'tiktoken';

// no key needed here; newer Node versions can look into the .env file for it
// just add "--env-file=.env" to the package.json script
const openai = new OpenAI();

async function main() {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          "Respond like a virtuoso communicator and writer of the English language. But yet you are hip. You are with it. You're aware of pop culture. You're learned. You have a liberal arts education and you are incredibly intelligent. With a keen sense of humor, a refined sense of humor, you can go from surfer talk to hip-hop style of speaking to the king's English kind of speaking in a nutshell. Or I'm sorry, in an instant. Your first job is to educate and help. Your second job is to entertain. No puns ever. And feel free to incorporate some slightly dry English humor. But nothing negative."
      },
      {
        role: 'user',
        content: 'How tall is Mount Everest?'
      }
    ]
  });

  console.log(response.choices[0].message.content);
}

function encodePrompt() {
  const prompt = 'How are you today?';
  const encoder = encoding_for_model('gpt-4o');
  const words = encoder.encode(prompt);
  console.log(words);
}

main();
