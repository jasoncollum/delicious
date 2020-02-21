import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(e) {
    e.preventDefault();
    axios.post(this.action)  // this = the heartForm that was clicked
        .then(res => {
            const isHearted = this.heart.classList.toggle('heart__button--hearted');  // heart is a sub element of heartForm
            $('.heart-count').textContent = res.data.hearts.length; // update heart count in navbar
            if (isHearted) {
                this.heart.classList.add('heart__button--float');  // float adds scss animation
                setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500);
            }
        })
        .catch(console.error);
}

export default ajaxHeart;