import express from 'express';
import Chat from '../models/Chat.js';
import ollama from 'ollama';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Get available models from Ollama
    const models = await ollama.list();
    
    // Get recent chats
    const recentChats = await Chat.find()
      .sort({ updatedAt: -1 })
      .limit(5);
    
    res.render('index', { 
      models: models.models,
      recentChats 
    });
  } catch (error) {
    console.error('Error:', error);
    res.render('index', { 
      models: [],
      recentChats: [],
      error: 'Failed to fetch models or recent chats' 
    });
  }
});

export default router;