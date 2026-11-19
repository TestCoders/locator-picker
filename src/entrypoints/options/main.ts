import { initHistoryView } from '@/options/history-view';
import { initOptionsForm } from '@/options/options-form';

const choices = document.getElementById('choices');
const status = document.getElementById('status');
if (choices && status) void initOptionsForm(choices, status);

const history = document.getElementById('history');
const historyStatus = document.getElementById('history-status');
if (history && historyStatus) initHistoryView(history, historyStatus);
