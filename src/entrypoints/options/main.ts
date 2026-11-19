import { initOptionsForm } from '@/options/options-form';

const choices = document.getElementById('choices');
const status = document.getElementById('status');
if (choices && status) void initOptionsForm(choices, status);
