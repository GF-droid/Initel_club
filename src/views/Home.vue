<template>

  <div class="container">
    <!-- 导航区 -->
    <div class="nav-container">
      <nav-home></nav-home>
    </div>
    <!-- 上方用户区 -->
    <div class="right-container">
      <div class="title-container">
        <title-home></title-home>

      </div>
      <!-- 展示区 -->
      <div class="content-container">
        <router-view></router-view>
      </div>
    </div>

  </div>

</template>

<script lang="ts" setup name="Home">
import NavHome from "@/components/home/NavHome.vue";
import TitleHome from "@/components/home/TitleHome.vue";
// import Navtable from "@/components/home/Navtable.vue";
import { RouterView } from "vue-router";




</script>

<style scoped>
.container {
  width: 100vw;
  height: 100vh;
  background-color: white;
  overflow: hidden;
  display: flex;
}

/* 导航区 */
.nav-container {
  height: 100vh;
  flex: 0 0 17%;
  /* background-color: #3dd68c; */
  background-color: hsl(0, 2%, 20%);
}

.right-container {
  flex: 1 0 60%;
  min-width: 0;
  margin-top: 0px;
  display: flex;
  flex-direction: column;
  /* 垂直排列子元素 */
  height: 100vh;
  min-height: 0;
  /* 占满父容器的高度 */
}

.title-container {
  width: 100%;
  height: 60px;
  background-color: hsl(0, 2%, 20%);
  border: 1px solid #474141fe;
  border-left: none;
  border-top: none;
  /* flex: 0 0 8%; */
  /* 不增长，不缩小，占父容器高度的5% */

}

.content-container {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  /* 可以增长，不缩小，占父容器高度的95% */
}
</style>
