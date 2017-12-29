import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(event) {
  event.preventDefault();
  axios
    .post(this.action)
    .then(res => {
      const isHearted = this.heart.classList.toggle('heart__button--hearted');
      $('.heart-count').textContent = res.data.hearts.length;
      // Add little animation
      if(isHearted) {
        this.heart.classList.add('heart__button--float');
        setTimeout(() => {
          this.heart.classList.remove('heart__button--float');
        }, 1500);
      }
    })
    .catch(err => {
      console.error(err);
    });
}

export default ajaxHeart;