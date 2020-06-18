import './scss/main.scss';
import {RankingAdapter} from '../tasks/RankingAdapter';
import * as d3 from 'd3';
import {LocalDataProvider} from 'lineupjs';
import {PanelTab} from 'tdp_core/dist/lineup/internal/panel/PanelTab';
import {IPanelTabExtensionDesc} from 'tdp_core/dist/lineup/internal/LineUpPanelActions';
import {RowComparison} from '../tasks/RowComparisonTask';
import {ColumnComparison} from '../tasks/ColumnComparisonTask';
import { ATouringTask } from '../tasks/ATouringTask';

export const tasks = [
  new RowComparison(),
  new ColumnComparison(),
].sort((a, b) => b.order - a.order); // sort descending


const touringTemplate = `
<p class="touring-intro-text">
  This panel allows you to perform basic statistical analyses. You can either compare multiple columns (e.g., are the values of column A correlated with the values of column B?)
  or compare sets of rows (e.g., does row set 1 differ from row set 2 with respect to the values in column C?).
</p>
<div class="alert alert-warning" role="alert">
  <strong>Please note:</strong> This panel is still under development. Please report any problems you might observe. Furthermore, there is currently no multiple-testing correction being performed.
</div>
<div class="input">
  <div class="type form-horizontal"> <!-- https://getbootstrap.com/docs/3.3/css/#forms-horizontal -->
    <div class="form-group">
      <label class="col-sm-4 control-label" style="padding-top: 0.5em;">What do you want to compare?</label> <!-- 1em top padding to center vertically-->
    </div>
  </div>
</div>

<div class="output"></div> <!-- task output -->`;


export class TouringPanel {

  private readonly node: HTMLElement;
  private ranking: RankingAdapter;
  private currentTask: ATouringTask;
  private active: boolean;

  constructor(private readonly _desc: IPanelTabExtensionDesc, private readonly tab: PanelTab, private readonly provider: LocalDataProvider) {
    this.node = tab.node;
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
    for (const task of tasks) {
      task.init(this.ranking, d3.select(this.node).select('div.output').node() as HTMLElement);
    }
  }

  private insertTasks() {
    // For each Task, create a button
    // Link tasks with buttons
    const taskSelectForm = d3.select(this.node).select('.input .type .form-group');
    const taskButtons = taskSelectForm.selectAll('.btn-wrapper').data(tasks, (task) => task.id);

    taskButtons.enter() // enter: add a button for each task
      .append('div').attr('class', `btn-wrapper col-sm-${Math.max(Math.floor(8 / tasks.length), 1)}`)
      .append('button').attr('class', 'task-btn btn btn-default btn-block')
      .classed('active', (d, i) => i === 0) // Activate first task
      .html((d) => `<img src="${d.icon}"/>${d.label}`);


    // update: nothing to do
    taskButtons.exit().remove();   // exit: remove tasks no longer displayed
    taskButtons.order();           // order domelements as in the array
  }

  private addEventListeners() {
    this.tab.on(PanelTab.SHOW_PANEL, () => {
      if (this.active === true) {
        return; // do not update tasks when clicking on open touring button and touring panel is already open
      }

      this.updateOutput(true); // update tasks when panel opens

      this.active = true;
      this.currentTask.addEventListeners();
    });

    this.tab.on(PanelTab.HIDE_PANEL, () => {
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
    const activeButton = d3.select(this.node).select('button.task-btn.active');

    if(activeButton.size() === 0) {
      console.warn('No comparison tasks registered and found.');
      return;
    }

    this.currentTask = activeButton.datum() as ATouringTask;
    this.currentTask.show();
  }

    /**
   *
   * @param tab PanelTab
   * @param provider Instance of the LocalDataProvider that contains all ranking
   * @param desc Options provided through the extension point i.e `headerCssClass, headerTitle`
   */
  static create(desc: IPanelTabExtensionDesc, tab: PanelTab, provider: LocalDataProvider): void {
    // tslint:disable-next-line:no-unused-expression
    new TouringPanel(desc, tab, provider);
  }
}


