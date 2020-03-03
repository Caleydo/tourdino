import './style.scss';
import {RankingAdapter} from './RankingAdapter';
import * as d3 from 'd3';
import {tasks as Tasks, ATouringTask} from './tasks/Tasks';
import {LocalDataProvider} from 'lineupjs';
import {IPluginDesc} from 'phovea_core/src/plugin';
import {PanelTabEvents} from 'tdp_core/src/lineup/internal/panel/PanelTab';


const touringTemplate = `
<div class="input">
  <div class="type form-horizontal"> <!-- https://getbootstrap.com/docs/3.3/css/#forms-horizontal -->
    <div class="form-group">
      <label class="col-sm-4 control-label" style="padding-top: 0.5em;">What do you want to compare?</label> <!-- 1em top padding to center vertically-->
    </div>
  </div>
</div>

<div class="output"></div> <!-- task output -->`;


class TouringPanel {

  private ranking: RankingAdapter;
  private currentTask: ATouringTask;
  private active: boolean;

  constructor(private readonly node: HTMLElement, protected readonly provider: LocalDataProvider, protected readonly desc: IPanelTabExtensionDesc, private events: PanelTabEvents) {
    this.node.classList.add('touring');
    this.node.innerHTML = touringTemplate;
    this.init();
  }

  private init() {
    this.ranking = new RankingAdapter(this.provider);
    this.initTasks();
    this.insertTasks();
    this.addEventListeners();
    this.updateTask();
  }
  private initTasks() {
    for (const task of Tasks) {
      task.init(this.ranking, d3.select(this.node).select('div.output').node() as HTMLElement);
    }
  }

  private insertTasks() {
    // For each Task, create a button
    // Link tasks with buttons
    const taskSelectForm = d3.select(this.node).select('.input .type .form-group');
    const taskButtons = taskSelectForm.selectAll('.btn-wrapper').data(Tasks, (task) => task.id);

    taskButtons.enter() // enter: add a button for each task
      .append('div').attr('class', `btn-wrapper col-sm-${Math.max(Math.floor(8 / Tasks.length), 1)}`)
      .append('button').attr('class', 'task-btn btn btn-default btn-block')
      .classed('active', (d, i) => i === 0) // Activate first task
      .html((d) => `<img src="${d.icon}"/>${d.label}`);


    // update: nothing to do
    taskButtons.exit().remove();   // exit: remove tasks no longer displayed
    taskButtons.order();           // order domelements as in the array
  }

  private addEventListeners() {
    this.events.on(PanelTabEvents.SHOW_PANEL, () => {
      if (this.active === true) {
        return; // do not update tasks when clicking on open touring button and touring panel is already open
      }

      this.updateOutput(true); // update tasks when panel opens

      this.active = true;
      this.currentTask.addEventListeners();
    });

    this.events.on(PanelTabEvents.HIDE_PANEL, () => {
      this.active = false;
      this.currentTask.removeEventListeners();
    });
    // Click a different task
    d3.select(this.node).selectAll('button.task-btn').on('click', (task) => {
      const taskButtons = d3.select(this.node).selectAll('button.task-btn');
      if (this.currentTask && this.currentTask.id !== task.id) { // task changed
        taskButtons.classed('active', (d) => d.id === task.id);
        this.currentTask.hide(); // hide old task
        this.updateOutput(); // will show new task
      }
    });
  }

  public async updateOutput(forceUpdate?: boolean) {
    if (this.active || forceUpdate) {
      await setTimeout(() => this.updateTask(), 0);
    } else {
      console.log('Touring Panel is hidden, skip update.');
    }
  }

  private updateTask() {
    this.currentTask = d3.select(this.node).select('button.task-btn.active').datum() as ATouringTask;
    this.currentTask.show();
  }
}

/**
 *
 * @param parent Parent HTML node
 * @param provider Instance of the LocalDataProvider that contains all ranking
 * @param desc Options provided through the extension point i.e `headerCssClass, headerTitle`
 * @param events Instance PanelTabEvents
 */
export default function create(parent: HTMLElement, provider: LocalDataProvider, desc: IPanelTabExtensionDesc, events: PanelTabEvents): void {
  // tslint:disable-next-line:no-unused-expression
  new TouringPanel(parent, provider, desc, events);
}
