const { runAssistantChat } = require('../../../services/aiAssistant');
const AppError = require('../../../utils/AppError');

async function chat(req, res, next) {
  try {
    const { message, profile, history } = req.body || {};

    const result = await runAssistantChat({
      message,
      profile,
      history,
    });

    res.json({
      success: true,
      reply: result.reply,
      recommendations: result.recommendations,
    });
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') {
      return next(new AppError(err.message, 503, 'AI_NOT_CONFIGURED'));
    }
    if (err.status === 400) {
      return next(new AppError(err.message, 400));
    }
    if (err.code === 'AI_QUOTA_EXCEEDED' || err.status === 429) {
      return next(
        new AppError(
          err.message ||
            'AI quota exceeded. Try again in a minute, or switch to Groq in server settings.',
          429,
          'AI_QUOTA_EXCEEDED',
        ),
      );
    }
    console.error('[AI Assistant]', err.message);
    return next(
      new AppError(
        'AI assistant is temporarily unavailable. Please try again later.',
        502,
      ),
    );
  }
}

module.exports = {
  chat,
};
