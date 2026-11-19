import { initHistoryView } from '@/options/history-view';
import { initClassOption } from '@/options/class-option';
import { initOptionsForm } from '@/options/options-form';

const choices = document.getElementById('choices');
const status = document.getElementById('status');
if (choices && status) void initOptionsForm(choices, status);

const detectClasses = document.getElementById('detect-classes');
if (detectClasses instanceof HTMLInputElement && status) void initClassOption(detectClasses, status);

const history = document.getElementById('history');
const historyStatus = document.getElementById('history-status');
if (history && historyStatus) initHistoryView(history, historyStatus);
