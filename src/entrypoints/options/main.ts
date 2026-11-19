import { initAiForm } from '@/options/ai-form';
import { initHistoryView } from '@/options/history-view';
import { initOptionsForm } from '@/options/options-form';

const choices = document.getElementById('choices');
const status = document.getElementById('status');
if (choices && status) void initOptionsForm(choices, status);

const history = document.getElementById('history');
const historyStatus = document.getElementById('history-status');
if (history && historyStatus) initHistoryView(history, historyStatus);

const ai = document.getElementById('ai');
const aiStatus = document.getElementById('ai-status');
if (ai && aiStatus) void initAiForm(ai, aiStatus);
